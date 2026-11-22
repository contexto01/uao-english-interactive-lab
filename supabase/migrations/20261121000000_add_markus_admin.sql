-- Grant administrator access to Markus Salazar.
-- This also updates the profile when the account already existed.

update public.profiles
set role = 'admin'
where lower(email) = 'markus.salazar@uao.edu.co';

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
    case
      when lower(new.email) in ('daniel_ste.barrera@uao.edu.co', 'markus.salazar@uao.edu.co') then 'admin'
      else 'student'
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        role = case when excluded.role = 'admin' then 'admin' else public.profiles.role end;
  return new;
end;
$$;
