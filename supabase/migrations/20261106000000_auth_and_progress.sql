-- Supabase Auth-backed profiles and sequential challenge progress.
-- Run this migration in the Supabase SQL Editor or with the Supabase CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_id text not null,
  completed boolean not null default true check (completed),
  best_score integer not null default 0 check (best_score >= 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

create index if not exists user_progress_challenge_id_idx
  on public.user_progress (challenge_id);

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;

-- Reject non-institutional identities even if the OAuth flow is called directly.
create or replace function public.enforce_uao_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) !~ '^[^@]+@uao[.]edu[.]co$' then
    raise exception 'Only @uao.edu.co accounts may sign in.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_uao_email_on_auth_user on auth.users;
create trigger enforce_uao_email_on_auth_user
  before insert or update of email on auth.users
  for each row execute function public.enforce_uao_email();

-- The first admin is granted by exact email. Users cannot change their own role.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case when lower(new.email) = 'daniel_ste.barrera@uao.edu.co' then 'admin' else 'student' end
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        role = case when excluded.role = 'admin' then 'admin' else public.profiles.role end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill any accounts that existed before this migration was run.
insert into public.profiles (id, email, display_name, role)
select
  users.id,
  lower(users.email),
  coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
  case when lower(users.email) = 'daniel_ste.barrera@uao.edu.co' then 'admin' else 'student' end
from auth.users as users
where users.email is not null
on conflict (id) do update
  set email = excluded.email,
      role = case when excluded.role = 'admin' then 'admin' else public.profiles.role end;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

drop policy if exists "Users and admins can read profiles" on public.profiles;
create policy "Users and admins can read profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Users and admins can read progress" on public.user_progress;
create policy "Users and admins can read progress"
  on public.user_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- No direct INSERT/UPDATE/DELETE policies are granted for progress.
-- Completion must pass through this RPC, which enforces the agreed level order.
create or replace function public.complete_challenge(p_challenge_id text, p_score integer)
returns table (challenge_id text, best_score integer, completed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  challenge_order text[] := array[
    'conditionals',
    'relative-clauses',
    'infinitives-gerunds',
    'connectors-cause-reason-purpose',
    'question-tags',
    'determiners'
  ];
  challenge_position integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_score is null or p_score < 0 then
    raise exception 'Score must be a non-negative integer.' using errcode = '22023';
  end if;

  challenge_position := array_position(challenge_order, p_challenge_id);
  if challenge_position is null then
    raise exception 'Unknown challenge.' using errcode = '22023';
  end if;

  if challenge_position > 1 and not exists (
    select 1
    from public.user_progress as previous_progress
    where previous_progress.user_id = current_user_id
      and previous_progress.challenge_id = challenge_order[challenge_position - 1]
      and previous_progress.completed
  ) then
    raise exception 'Complete the previous challenge first.' using errcode = '42501';
  end if;

  insert into public.user_progress as stored_progress
    (user_id, challenge_id, completed, best_score, completed_at)
  values (current_user_id, p_challenge_id, true, p_score, now())
  on conflict (user_id, challenge_id) do update
    set completed = true,
        best_score = greatest(stored_progress.best_score, excluded.best_score)
  returning stored_progress.challenge_id, stored_progress.best_score, stored_progress.completed_at
  into challenge_id, best_score, completed_at;

  return next;
end;
$$;

revoke all on function public.enforce_uao_email() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.complete_challenge(text, integer) from public, anon;
grant execute on function public.complete_challenge(text, integer) to authenticated;

grant select on public.profiles to authenticated;
grant select on public.user_progress to authenticated;
