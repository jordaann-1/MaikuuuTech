# MaikuuuTech

A personal developer portfolio and protected content management system built with Next.js, React, TypeScript, Tailwind CSS, and Supabase. Cloudflare Workers is the deployment target through OpenNext.

The supplied name and headline are included. Projects, biography, education, experience, certificates, achievements, social links, and resume start empty. There are no fictional credentials or personal-history records. The inquiry migration seeds only the 22 requested service offerings, five catalog categories, and configurable budget labels.

**Status:** local implementation; live Supabase and production acceptance require external setup. See [verification](docs/VERIFICATION.md) for actual results. Nothing is deployed or pushed automatically.

## Quick start

Requirements: Node.js 22+ (24 recommended), npm, and a Supabase project. Docker is needed only for local Supabase.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`. Copy files with `Copy-Item .env.example .env.local`. Open <http://localhost:3000>. Without credentials, public pages render the supplied identity and empty states; sign-in and messaging clearly indicate missing setup. This mode is not a database substitute.

## Supabase setup

Data API ON, automatic table exposure OFF, and automatic RLS ON are supported. Keep the `public` schema exposed and `private` unexposed. The migrations include explicit per-object grants; no broad automatic grants are required. See the [hosted-defaults migration review](docs/SUPABASE_MIGRATION_REVIEW.md) before applying the files in SQL Editor.

1. Create a Supabase project. Copy its Project URL and **publishable** API key into `.env.local`. These two values are intentionally public. Do not use a secret API key in either `NEXT_PUBLIC_` variable.
2. Link and apply both checked-in migrations in filename order:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   Alternatively, run both complete migration files in Supabase SQL Editor once, in filename order. Do not create tables individually. The migrations create the schema, RLS, RPC functions, private storage bucket, categories, and initial settings. It is a forward migration, not a script to rerun against an already migrated database.

3. Disable public signup in Supabase Auth. Create your account using Dashboard → Authentication → Users → Add user. Use a unique password of at least 12 characters and a verified email. Copy the user's UUID.
4. In the trusted SQL Editor, grant membership:

   ```sql
   insert into public.admin_profiles (id, display_name)
   values ('YOUR_AUTH_USER_UUID', 'YOUR_DISPLAY_NAME');
   ```

   Membership cannot be granted through the public website or by editing user metadata. Remove the row to revoke administrator access. An authenticated account alone has no admin privileges.

5. Configure Auth Site URL and allowed redirect URLs for localhost and your final domain. Configure recovery email as described in [security](docs/SECURITY.md). No public registration route exists.
6. Visit `/admin/login`, sign in, and complete Site settings. Add your real content. New records are drafts until explicitly published. A category must also be published for its skills to appear publicly.

## Environment

Only placeholders are committed in `.env.example`.

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase API origin.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key.
- `NEXT_PUBLIC_SITE_URL`: exact site origin, without a path. Used for CSRF checks, canonical URLs, and recovery redirects. Use `http://localhost:3000` locally; HTTPS in production.
- `SUPABASE_SECRET_KEY`: **server-only** Supabase secret API key, used only on the server for contact/inquiry submission and pending-upload cleanup. It is never needed in the browser or for admin content writes.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public Cloudflare Turnstile widget key.
- `TURNSTILE_SECRET_KEY`: server-side Turnstile verification secret.
- `CONTACT_HASH_SECRET`: at least 32 random characters, used to HMAC client IPs for database rate limiting. Generate 32 random bytes as shown in `.env.example`.

Contact submissions fail closed if required configuration is absent. Use [Turnstile test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) only for local tests. Production checks the verification action and hostname.

## Local database

With Docker running:

```sh
npm run db:start
npm run db:reset
```

The CLI prints local URL/key information; use that in `.env.local`. Create a local Auth user and admin membership using local Studio at <http://localhost:54323>. `db:reset` destroys **local** database contents; do not run linked reset commands against production.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run build:cloudflare
npx wrangler deploy --dry-run --outdir .local/worker-dry-run
npm run secrets:scan
npm audit --omit=dev
```

Unit tests cover input validation, CSRF, request bounds, safe errors, and file signatures. PGlite tests run both actual migrations in a real PostgreSQL WASM engine with small Supabase Auth/Storage interface fixtures; they exercise RLS, CRUD, publication, message privacy, and transactional rate limits. They do **not** prove Supabase's hosted Auth or Storage services work.

Playwright's desktop and mobile checks exercise the unconfigured local app, navigation, empty projects, form setup state, private endpoints, SEO, and overflow. Run these against an unconfigured checkout; they intentionally expect no real content.

The browser suite also runs axe WCAG A/AA checks on the public and sign-in pages and checks keyboard navigation. Automated scans cover the tested empty/configuration states; they do not certify all administrator-entered content or replace a manual accessibility review.

`npm run test:live` exits with **BLOCKED** (code 2) without a dedicated test Supabase project, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, and `TEST_ALLOW_WRITES=true`. It creates and deletes isolated fixture content and tests real login, invalid login, publication, CRUD, storage privacy, and logout. Do not use a production database. Keep test credentials out of Git. Recovery delivery and real Turnstile submission also require manual acceptance checks.

## Content updates

Public pages render dynamically and database HTTP requests use `cache: 'no-store'`. React request caching only deduplicates reads during one render. Admin saves are committed to PostgreSQL immediately; normal navigation or refresh retrieves the new published content. There is no build-time content snapshot or persistent content cache to invalidate. Do not add a Cloudflare “cache everything” rule for HTML or APIs.

## Source control and hosting

The lockfile is committed-ready. `.gitignore` excludes environment files, builds, logs, private keys, local artifacts, and dependency folders. Run the secret scan and inspect `git diff --cached` before committing. Add your own GitHub remote when ready; no remote, commit, or push is created by application scripts.

Cloudflare configuration and a CI workflow are included. The workflow verifies and dry-runs the Worker; it does not deploy. Production deployment requires your explicit decision, account configuration, credentials, and the acceptance checks in [deployment](docs/DEPLOYMENT.md).

Further documentation: [architecture](docs/ARCHITECTURE.md), [database](docs/DATABASE.md), [security](docs/SECURITY.md), [admin guide](docs/ADMIN_GUIDE.md), [initial audit](docs/INITIAL_AUDIT.md).

## Client inquiries and service catalog

The Get in Touch page includes Project inquiry and General message forms. The general contact inbox is preserved. Inquiries use the existing Services catalog, configurable service categories and budget ranges, private supporting documents, and a dedicated workflow inside the same admin dashboard.

Apply `202610150001_portfolio.sql` followed by `202610150002_client_inquiries.sql`. Existing installations apply only the new unapplied migration through the CLI. Do not edit/reapply the original migration or run a reset against production. The new migration preserves existing messages/services and adds the requested service offerings, without adding fictional clients or projects.

Admin navigation includes **Client Inquiries**, **Services**, **Service categories**, and **Inquiry budgets**. Publication means active; an archived service or a service in an unpublished category is excluded from new public selections. Existing inquiries retain service and budget snapshots even after catalog deletion.

All seven environment values above are needed for real submissions. Configure the same Turnstile widget for both `contact` and `inquiry` actions. There is no email notification provider; submissions persist independently of email. The Open email draft action opens your mail application.

`npm run test:e2e` also starts an isolated UI fixture server on loopback port 3101. It bundles actual app components with explicit test API/verification stubs, outside the Next.js application. Fixtures never ship as public application routes. These tests verify interaction/layout; they do not prove live Supabase Auth, Storage, Turnstile, or server-to-service connectivity.

For crash leftovers, `node scripts/cleanup-inquiries.mjs` reports stale incomplete submissions older than 24 hours without changing anything. After review, add `--apply` to remove their files and pending records. Run only in the intended configured environment. See [admin workflow](docs/ADMIN_GUIDE.md), [privacy/security](docs/SECURITY.md), and the [current implementation report](docs/VERIFICATION.md).

`npm run test:live:inquiries` adds an opt-in hosted inquiry/catalog/Auth/Storage check. It also requires SUPABASE_SECRET_KEY and TEST_ALLOW_WRITES=true in a dedicated test project. It creates explicit fixtures and attempts cleanup; it does not bypass Turnstile in the public application. With no credentials it exits BLOCKED. See [design changes](docs/DESIGN_REPORT.md) for the UI transformation report.
