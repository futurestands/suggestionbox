# Anonymous Suggestion Box

React + TypeScript + Vite + Tailwind frontend, Supabase (Postgres, Auth, Edge Function, RLS), Cloudflare Pages hosting.

## Run locally
```
npm install
cp .env.example .env     # fill in your Supabase URL + anon key
npm run dev              # http://localhost:5173/submit
```

## Supabase setup
1. Create a project at supabase.com (free tier).
2. SQL Editor: run `001_init.sql`, then `002_settings.sql`, in that order (or `supabase db push`).
3. Authentication > Providers > Email: **disable "Allow new users to sign up"**. Enable MFA (Authentication > Multi-factor).
4. Authentication > Users > Add user: create the first manager (strong password, no default credentials in code).
5. SQL Editor, make that user admin (this is the only bootstrap step, done by you, never via a public endpoint):
   `insert into manager_roles (user_id, role) select id, 'admin' from auth.users where email = 'you@org.org';`
6. Deploy the submission function:
   ```
   npm i -g supabase && supabase login && supabase link --project-ref YOUR_REF
   supabase secrets set RL_SALT=$(openssl rand -hex 16) ALLOWED_ORIGIN=https://YOUR-SITE.pages.dev
   supabase functions deploy submit --no-verify-jwt
   ```
Add managers: create the user in Auth, then insert a `manager_roles` row (`manager` or `reviewer`). Revoke: `update manager_roles set active=false where user_id='...'`.

## Cloudflare Pages
1. Push this repo to GitHub (`.env` is git-ignored).
2. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git.
3. Build command `npm run build`, output directory `dist`.
4. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (and optional `VITE_ORG_NAME`). Never add the service-role key here.
5. Deploy. Your public link is `https://<project>.pages.dev/submit`; manager area is `/manager`. `public/_redirects` makes direct navigation and refresh work.

## Costs
Supabase Free and Cloudflare Pages Free: $0/month. Supabase Free pauses projects after about a week of inactivity and has no automatic backups; Pro is about $25/month. Verify current pricing before relying on it.

## Privacy notes
No names, emails, IPs, user agents or cookies are stored with submissions. The rate limiter keeps only salted hashes in memory, never in the database. Cloudflare and Supabase still process technical metadata in their own logs, so do not promise absolute untraceability.

## Backup and retention
Free tier: run `pg_dump` periodically (Supabase > Database > Connection string) and store encrypted. A commented pg_cron retention example is at the bottom of the migration.

## Security checklist
RLS enabled on every table; signup disabled; MFA on; RL_SALT set; ALLOWED_ORIGIN set; only the anon key in the frontend; test anonymous `select` on `suggestions` returns nothing; consider adding Cloudflare Turnstile for stronger spam protection.

## Settings, logo and verification
Sign in as admin > Settings. Put a hosted image link in 'Logo image URL' when you have the real logo (a placeholder shows until then). Retention is applied by the 'Run retention now' button.

After deployment run `SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/verify-security.mjs`. It checks anonymous access is blocked and validation works, and leaves one test submission to delete.
