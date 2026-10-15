# Hosted Supabase migration review — 2026-10-15

Reviewed the two local migration files against the supplied settings: Data API ON, Automatically expose new tables OFF, automatic RLS ON. No connection to the hosted project was made, and nothing was applied to it.

## Result and Data API exposure

**PASS — local syntax, dependency, ACL, RLS and policy tests. NOT VERIFIED — hosted execution and actual Data API/Auth/Storage behavior.**

Keep the supplied settings. Automatic exposure OFF removes implicit permissions on newly created objects; it does not override explicit GRANT statements. The application uses supabase-js/PostgREST, so its required objects must have grants. Both migrations already explicitly grant the required table operations. RLS is a separate row-access check and does not grant table privileges. See [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api).

The Data API must expose the **public** schema, which the app's clients use. Keep **private** outside the exposed-schema list. USAGE/EXECUTE grants for private policy helpers do not require exposing their schema as REST endpoints. There is no need to enable automatic exposure, grant every table to anon, or expose private rate-limit data.

## Local fixes

The first migration now explicitly grants USAGE on public to the three API roles. This makes the schema-access dependency visible; it grants neither CREATE nor table access by itself.

Both migrations now reset each application function's EXECUTE grants for PUBLIC, anon, authenticated and service_role before applying the intended allowlist. Previously, direct role grants inherited from legacy defaults could survive a REVOKE from PUBLIC alone. Trigger helpers also explicitly revoke direct API-role execution. The first migration explicitly revokes direct access to private.contact_rate_limits; its owner-run RPCs continue to work.

The resulting function permissions are:

- public.project_categories(): anon and authenticated.
- public.save_project(uuid,jsonb): authenticated; its admin membership check and invoker RLS remain.
- public.submit_contact(...), public.reserve_inquiry(...) and public.complete_inquiry(...): service_role only.
- public.inquiry_summary(): authenticated; its admin membership check and invoker RLS remain.
- private.is_admin(): the API roles that use it in policies/functions.
- private.asset_visible(text): anon and authenticated for storage reads.
- private.asset_referenced(text): authenticated for administrator storage deletion checks.
- private.touch_updated_at() and private.log_inquiry_activity(): no direct API-role execution; attached triggers still run.

No table, policy, authentication rule, personal data, storage bucket visibility, project-wide default privileges or hosted setting was loosened. These are permission-hardening edits to the initial, not-yet-applied migration files. If either version was already applied anywhere, do not rerun it; make a new forward permission migration for that environment instead.

PostgreSQL's normal PUBLIC EXECUTE default is global. A per-schema ALTER DEFAULT PRIVILEGES REVOKE cannot subtract a global grant. The test harness clears that global default only inside its isolated strict fixture; the application migrations use per-object REVOKE and do not alter project-wide defaults. See [PostgreSQL default privileges](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html).

## Syntax and dependencies

Both complete files execute in the local PostgreSQL engine, in order. They use standard PostgreSQL SQL/PLpgSQL, UUID keys, explicit foreign keys, checks, indexes and triggers. gen_random_uuid() is built into supported PostgreSQL versions used here; these migrations do not need a new pgcrypto extension or identity/serial sequence grants.

A normal Supabase project supplies the anon/authenticated/service_role roles, auth.users, auth.uid(), storage.buckets, storage.objects and storage.foldername(). These migrations depend on those managed interfaces; they do not create replacement Auth/Storage infrastructure.

Migration 002 depends on the services table and its published_read policy, private.is_admin(), private.touch_updated_at() and the private quota table from migration 001. It preserves original contact messages, extends services and creates the inquiry workflow. Running 002 first will fail.

## RLS, helper functions and Storage

Every application table in public explicitly enables RLS. An automatic RLS event trigger may enable it earlier; enabling it again is compatible. The migrations do not disable the project's automatic RLS feature. Enabling RLS alone creates no policies. See [Supabase's automatic-RLS event-trigger example](https://supabase.com/docs/guides/database/postgres/event-triggers).

Public visitors read settings and published content. Skills/services also require visible categories where applicable. Authenticated nonadmins retain public-content visibility but cannot manage content or read confidential messages/inquiries. Trusted admin_profiles membership gates management, and ordinary client roles cannot insert membership rows.

SECURITY DEFINER helpers use an empty search_path and qualified application relations. The membership helper avoids recursive admin-profile policies. The project save and inquiry summary functions remain SECURITY INVOKER and enforce membership. The private quota table is reachable only through owner-run submission functions, not direct client grants.

Both Storage buckets remain private. Portfolio reads require a published reference or administrator access; uploads require an administrator-owned UUID prefix, and deletion requires an unreferenced asset. Inquiry reads/deletes require an administrator, and direct public uploads are absent. New-public-table default grants do not replace the managed storage.objects ACLs or these policies. See [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control). Hosted file handling and signed-URL behavior still need live verification.

## Local verification

The database suites now run twice: strict explicit exposure with an automatic-RLS event trigger, and legacy automatic grants. A probe test verifies that the strict fixture really denies automatic table/function access before application grants and really enables RLS on new tables.

The suites execute the actual migration SQL and test function-role allowlists, all-table RLS, published reads, admin/nonadmin CRUD, membership protection, message/inquiry privacy, private helpers, storage policies, transactional RPCs, snapshots and quotas. Supabase-owned Auth/Storage interfaces are stubbed; PostgREST, hosted event-trigger implementation and service APIs are not emulated as live services.

**PASS:** 112 tests across seven files, ESLint with zero warnings, and TypeScript including route type generation. Both complete migrations were tested in explicit transactions. No browser/build rerun was needed for these SQL/test/documentation changes. Supabase-hosted compatibility remains **NOT VERIFIED**. The broader project's earlier UI/build results are in [VERIFICATION.md](VERIFICATION.md).

## Can both files run in SQL Editor?

**Yes, for the intended fresh Supabase application schema, using the privileged postgres role, in this order:**

1. Run the full 202610150001_portfolio.sql file once.
2. After it succeeds, run the full 202610150002_client_inquiries.sql file once.

For atomic manual execution, wrap each complete file in BEGIN; and COMMIT; in its own SQL Editor query. The files contain no transaction-control statements, and the local database tests verified execution inside transactions as well. Do not run only the currently highlighted selection. Do not rerun the initial file if its tables already exist. If a transaction fails, roll it back and resolve the error before continuing.

The initial scripts create objects by name and are deliberately not rerunnable scripts. They are not suitable for an unrelated/prepopulated schema with colliding table, bucket or policy names. This review has not inspected the hosted database for such collisions.

Manual SQL Editor execution does not automatically reconcile the Supabase CLI's migration history. Before using CLI db push later, reconcile the two applied versions through the documented migration-history workflow; do not replay the CREATE statements. Administrator creation and environment configuration remain separate setup steps. This review did not create an administrator or expose any credentials.
