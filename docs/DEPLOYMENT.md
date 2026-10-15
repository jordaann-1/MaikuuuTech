# Cloudflare deployment and service limits

No deployment is performed by local build/check commands or the included CI workflow. Deploy only after reviewing the acceptance results and configuring your accounts.

## Supported architecture

[Cloudflare's OpenNext guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/) documents manual adapter setup; the current new-app recommendation is vinext. This repository deliberately retains the requested Next.js framework through [OpenNext](https://opennext.js.org/cloudflare). Next.js 16.4.1 satisfies adapter 1.20.12's published peer dependency. App Router, SSR, route handlers, and dynamic routes are used.

OpenNext does not currently support Node.js middleware. `src/middleware.ts` uses Edge middleware, which Next.js deprecates but still builds. Do not rename it to a Node-based proxy without rechecking adapter support. The application uses the normal Node runtime for route handlers, backed by Workers' Node compatibility support. No `runtime='edge'` page/handler override is used.

Configuration uses `.open-next/worker.js`, `.open-next/assets`, a self-reference service binding, `nodejs_compat`, and compatibility date 2026-10-15. Dynamic content avoids ISR/R2 cache requirements. No mandatory paid Images binding or disk storage is used.

## Build and runtime checks

```sh
npm ci
npm run build
npm run build:cloudflare
npx wrangler deploy --dry-run --outdir .local/worker-dry-run
npm run preview:cloudflare
```

With the local Worker listening on port 8787, run `npm run test:worker` in another terminal. It checks HTTP status/security headers, real browser rendering/CSS, protected API rejection, and the admin redirect against workerd. `WORKER_TEST_URL` can point it at a different **local test** origin. It does not exercise live Supabase without configuration.

The dry run bundles the Worker without uploading it. Preview runs workerd locally; check representative public pages, auth redirects, APIs, CSP/security headers, and database connectivity with test credentials. OpenNext notes that native Windows support is limited. If the adapter fails due to platform paths or native tooling, run the same commands in WSL or the included Ubuntu CI job and report the Windows limitation honestly. A normal Next build is not proof of Worker compatibility.

## Environment and account setup

1. Create and migrate Supabase. Disable signup; create the trusted administrator; configure SMTP/recovery and real content.
2. Create a free Cloudflare Turnstile widget for the final domain. Set the public site key and server verification secret. Do not use Turnstile testing keys publicly.
3. Configure the three `NEXT_PUBLIC_` application values and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as build environment values. Next embeds public values during compilation, so rebuild when changing them. Configure the same origin/URL values for runtime consistency.
4. Set `SUPABASE_SECRET_KEY`, `TURNSTILE_SECRET_KEY`, and `CONTACT_HASH_SECRET` as server-side Worker secrets. Use `npx wrangler secret put VARIABLE_NAME` or the Cloudflare dashboard; do not put credentials into wrangler.jsonc. Local Worker preview loads `.dev.vars`; start from `.dev.vars.example`, add needed runtime variables, and keep it ignored.
5. Confirm the Worker name matches the self-reference binding. Configure the domain/route in Cloudflare. Set exact HTTPS origins in Supabase Auth and `NEXT_PUBLIC_SITE_URL` before building.
6. Keep HTML and API responses uncached. Do not add a cache-everything rule. Keep logs free of message contents, credentials, cookies, and recovery links. Worker observability is disabled by default to avoid unexpected request logging.
7. Once you authorize deployment, sign in with Wrangler, build, and run `npm run deploy:cloudflare`. This command uploads the existing OpenNext build; rebuild after source/environment changes. The `--dry-run` alternative never deploys.

## Free-tier planning, checked 2026-10-15

[Supabase pricing](https://supabase.com/pricing) lists 500 MB database storage, 1 GB file storage, 5 GB egress plus 5 GB cached egress, 50,000 monthly active users, two active Free projects, and pausing after one week of inactivity. Automatic backups and image transformations are not included. A paused project will make dynamic pages unavailable until resumed. Keep external backups and monitor Storage/database usage.

[Cloudflare's current limits](https://developers.cloudflare.com/workers/platform/limits/) list 100,000 Worker requests/day, a 10 ms CPU budget/request, 128 MB memory, 50 subrequests/request, six simultaneous outgoing connections, and 20,000 static asset files on Free. SSR/auth workloads can exceed that CPU allowance; load test against your real content and account. Current official limits list a 64 MiB Worker size allowance, while the OpenNext overview still contains an older smaller limit: use Wrangler output and the current limits for your actual account before release.

The architecture has no mandatory paid integration, but unlimited traffic/storage, always-on Supabase service, and heavy SSR are not guaranteed on Free. Do not interpret a successful build as a guarantee of zero cost or sufficient free CPU.

## GitHub preparation

Run lint, typecheck, tests, builds, dependency audit, and secret scan. Review staged files, particularly `.env.example` and configuration. Commit source/lockfile/migration/docs only. Create your GitHub repository and remote when you choose, then push explicitly. CI runs checks and dry-run bundling; no automatic deployment or production secrets are needed for its unconfigured checks.

## Live acceptance before release

- Admin and nonadmin/anonymous authorization, session expiry, invalid login, logout, password recovery delivery.
- Every content section's create/edit/delete and visibility controls; site settings; resume replacement/removal.
- Create a project with gallery, publish, edit, unpublish, delete, checking public results after each step without rebuilding.
- Storage upload restrictions, draft asset privacy, signed URL expiry, replacement and detached-file deletion.
- Real Turnstile message submission, validation, invalid token rejection, rate limit, private inbox read/archive/delete.
- Final domain canonicals/sitemap/robots, mobile and keyboard usability, Core Web Vitals, real Worker CPU/request limits.

See docs/VERIFICATION.md for the completed local checks and outstanding external verification.

## Inquiry system release checks

Apply both migrations in order. Existing installations apply only the second unapplied migration. Verify that the inquiry bucket is private, the requested services/budget options are present, and no client data is visible to anonymous or nonadmin users. Keep the same seven environment variables; the server secret now also serves inquiry reservation/upload/completion and maintenance.

Register the final hostname with Turnstile. Production verifies hostname and action; the form sends `inquiry` and the existing message form sends `contact`. Both use a compact widget so the real challenge fits a 320px layout. [Cloudflare requires server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/); do not replace it with client-only checks or test keys in production.

Before release, test a real valid request with each supported file type, invalid/inactive service/budget, past date, failed/expired token, rate limit, duplicate retry and interrupted upload. Verify the persisted request appears after the documented polling interval; search/filter/page it; update status/priority/notes/read/archive; verify activity identity; download while authorized and reject anonymous/nonadmin access. Verify signed-link expiry, deletion and pending-upload cleanup against actual Storage. The local fixture suite cannot establish these service behaviors.

Schedule stale-pending cleanup on a trusted runner only if needed. No scheduler or external email provider has been configured automatically. Keep inquiry email notifications disabled until an actual provider is implemented and tested. Auth recovery SMTP is independent.

Three 5 MiB attachments are buffered and validated by the Worker, so measure worst-case memory, CPU and latency on the intended Cloudflare plan before production acceptance. A build and local workerd smoke do not prove the Free 10ms CPU allowance can support SSR plus multipart processing. Review storage/egress quotas and retention with real usage.
