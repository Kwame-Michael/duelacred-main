Supabase helpers and policies for Duelacred

Files in this folder:
- `functions/getSignedUrl/index.ts` — Edge Function to create signed URLs for private storage files.
- `policies/rls_policies.sql` — Recommended RLS policy SQL templates.

Deploying notes (CLI):

1. Login and link your project:
   supabase login
   supabase link --project-ref <PROJECT_REF>

2. Set service role secret (only on the project). The CLI disallows secret names starting with `SUPABASE_`, so use `SERVICE_ROLE_KEY`:
   supabase secrets set SERVICE_ROLE_KEY="<service_role_key>"

3. Deploy function:
   supabase functions deploy getSignedUrl --project-ref <PROJECT_REF>

4. Run policy SQL (if you want to apply via CLI):
   supabase db query < supabase/policies/rls_policies.sql

5. After deploy, call the function from your frontend (authenticated admin or server) to get signed URLs.
