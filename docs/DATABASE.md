# Database

The forward migrations are `supabase/migrations/202610150001_portfolio.sql` and `202610150002_client_inquiries.sql`, applied in that order. Apply them through `supabase db push`, or follow the SQL Editor procedure in the [hosted-defaults migration review](SUPABASE_MIGRATION_REVIEW.md). Local Supabase uses PostgreSQL 17. Never disable RLS to resolve an application error.

## Data model

- `site_settings`: singleton public identity, introduction, biography, interests/goals, specializations, contact, images, SEO, availability, and footer. Only supplied identity/headline and neutral site description are initialized.
- `admin_profiles`: trusted membership linked to `auth.users`; client roles have no insert/update/delete grants.
- `projects`: descriptions, problem/solution, role, architecture, features, category, dates/status, external URLs, thumbnail, publication/featured flags, and order. Slug is unique and constrained.
- `project_images`: ordered gallery and alt text, linked to a project with cascading deletion.
- `project_technologies`: normalized technology labels keyed by project and name.
- `skill_categories` and `skills`: category relationship, labels, descriptions, text icons, order, and visibility. Ten configurable category names are initialized, without asserting any personal skills.
- `experiences`, `education`, `certificates`, `achievements`, `services`: individually publishable records with the fields in the development brief.
- `social_links`: configurable HTTPS links.
- `resumes`: private PDF references, with a partial unique index allowing at most one published resume.
- `contact_messages`: private correspondence, read/archive state, and timestamps.
- `private.contact_rate_limits`: HMAC actor identifier, hourly window, and transactional counters; old windows removed during successful submissions.

Records use UUIDs, foreign keys, order values, and timestamps. Mutable content has `updated_at` triggers. Dates and key text lengths are constrained in PostgreSQL and validated at the API. Indexes support publication/order, child lookups, skills by category, and recent messages.

## Authorization policies

Anonymous users may select settings and published content, including only the children of published projects. A skill also needs a published category. Authenticated nonadmins receive the same public content and no private messages. Admin membership authorizes content management; it does not confer permission to grant membership to others.

The nonrecursive SECURITY DEFINER helper `private.is_admin()` has an empty search path and reads only the membership table. Membership mutations must be performed from the trusted dashboard/SQL environment. `save_project` is SECURITY INVOKER and rechecks membership. `submit_contact` is SECURITY DEFINER with execute permission granted only to `service_role`.

## Storage policies

`portfolio` is private with a 10 MiB bucket limit and JPEG, PNG, WebP, and PDF allowlist. Upload names begin with the authenticated administrator UUID. No client update policy exists. Deletion requires administrator status and no references, including drafts. Publication-dependent reads prevent guessing draft file paths.

## Testing and maintenance

`npm test` executes both exact migrations in PGlite and tests PostgreSQL policies, publication transitions, CRUD, message privacy, storage policies, and rate limits. Supabase-owned Auth/Storage interfaces are fixtures; hosted service behavior must be tested separately. Use `npm run test:live` only against a dedicated configured test project.

Back up the database and assets before future schema changes. Supabase Free has no included automatic backups. Retain/export content and Storage objects independently. Periodically delete unwanted messages, unused uploads, and stale test fixtures. Public project listings paginate 12 records and admin lists 30 records per page. Supabase's configured API row cap should be considered when very large content collections are introduced.

## Inquiry migration

The original data model is preserved. Both initial migration files now include the permission hardening documented in the [hosted-defaults review](SUPABASE_MIGRATION_REVIEW.md); these local edits are intended for this not-yet-migrated project. The second migration extends `services` with a unique slug, optional category/starting price, featured and archive flags. Existing publication and display-order columns are reused. New tables:

- `service_categories`: configurable name/slug/description/order/publication.
- `inquiry_budget_ranges`: configurable label/order/publication.
- `service_inquiries`: private client/project details, catalog references with immutable-by-application snapshots, consent version/time, random reference, status, admin priority/notes, read/archive flags, timestamps, submission nonce/fingerprint/HMAC actor and upload state.
- `inquiry_attachments`: private file metadata, randomized path, allowed MIME, bounded size, parent FK with cascade.
- `inquiry_activity`: timestamped action, administrator identity/name snapshot and previous/new workflow values. Notes themselves are not copied into the activity log.

Service and budget deletion sets their references to NULL while retaining historical labels. Inquiry deletion cascades metadata/activity. The application removes Storage objects before deleting the database parent; direct SQL deletion does not run object-storage cleanup.

Anonymous callers have no grants to read or write the three private tables. Authenticated nonadmins see no private rows and cannot mutate them. Administrators can read/manage inquiries; activity is generated by a definer trigger rather than arbitrary browser inserts. Server-only reservation/completion functions revoke execute from PUBLIC, anon and authenticated, granting it only to service_role. Statistics are SECURITY INVOKER and explicitly check admin membership.

The new private bucket `inquiry-attachments` permits administrator reads/deletes. There is no direct browser upload policy: trusted submission code validates files before secret-key upload. The original portfolio bucket/policies are preserved.

Indexes cover completed inquiries by recency, active status/priority, service, unread records, and attachment/activity parents. List pagination is 20; recent statistics include five records; activity is bounded to the latest 100 events. Search uses sanitized parameterized PostgREST filters, without constructing SQL.

The migration seeds exactly the requested 22 service offerings, five service categories and eight budget options. These are editable offerings, not asserted experience or client records. Academic descriptions explicitly offer legitimate mentoring/tutoring and guided development.

## Inquiry maintenance

Reservation shares `private.contact_rate_limits` with general messages: five accepted requests per actor per UTC clock hour and 100 globally per hour. Failed quota transactions roll back. Pending upload reservations count as accepted attempts even if later compensated, to limit upload abuse. The preferred-deadline business date is Asia/Manila.

Use `node scripts/cleanup-inquiries.mjs` for a dry run, and `--apply` only after reviewing the intended environment. Each batch examines up to 100 pending rows older than 24 hours, lists/removes their objects, then deletes the pending parent. Run repeatedly until clear; schedule it through a trusted maintenance runner if required. Completed inquiries are never selected. Do not log document or client content.

Review completed/declined/cancelled/archived records periodically and delete when no longer needed. Archiving does not delete personal data. Back up database and storage separately before migrations and retention operations.

## Hosted Data API defaults

Data API ON / Automatically expose new tables OFF / automatic RLS ON are supported through explicit grants. Grants make required operations reachable; RLS determines allowed rows. Keep public exposed and private unexposed. No identity/serial sequences need grants because IDs use UUID defaults. Per-object function ACL resets prevent inherited legacy EXECUTE grants from expanding the intended RPC surface. Trigger-only helpers have no direct API-role EXECUTE grants.

Tests run both legacy automatic grants and strict explicit grants with an automatic-RLS event trigger, applying the actual migration files inside transactions. Platform-owned Auth/Storage interfaces are isolated stubs, not a hosted Supabase connection. See [the migration review](SUPABASE_MIGRATION_REVIEW.md) for dependencies, exact local changes, SQL Editor order, and manual migration-history considerations.
