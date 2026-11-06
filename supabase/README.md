# Supabase setup

## 1. Add the public project settings

Copy `.env.example` to `.env.local` in the repository root and set:

- `NEXT_PUBLIC_SUPABASE_URL`: the Project URL from Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key from Supabase.

`.env.local` is ignored by Git. Never put a `service_role` key in a `NEXT_PUBLIC_` variable.

## 2. Create the tables and RLS policies

In Supabase, open **SQL Editor**, paste and run:

`supabase/migrations/20261106000000_auth_and_progress.sql`

Run this before the first student login if possible. The migration also backfills profiles for accounts that already exist.

## 3. Configure Google OAuth

1. In Supabase, open **Authentication → Sign In / Providers → Google** and enable Google.
2. Create a Google OAuth web client in Google Cloud. Copy the callback URL shown by Supabase (usually `https://<project-ref>.supabase.co/auth/v1/callback`) into Google's **Authorized redirect URIs**.
3. Paste the Google client ID and client secret directly into Supabase's Google provider settings. Do not put the secret in the repository or send it in chat.
4. In Supabase **Authentication → URL Configuration**, set the development site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback`. Add the production callback when the site is deployed.
5. If Google is the only login method, disable the Email provider in Supabase. The app and database also restrict new accounts to `@uao.edu.co`.

The first Google login creates the user's profile automatically. `daniel_ste.barrera@uao.edu.co` receives the admin role; other allowed accounts receive the student role.

## 4. Run the app

```bash
npm run dev
```

Students can sign in at `/login`, see their results at `/progreso`, and the configured admin can view the read-only dashboard at `/admin`.
