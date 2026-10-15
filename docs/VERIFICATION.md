# Client inquiry system and portfolio verification — 2026-10-15

**PASS — local implementation and verification below. BLOCKED — live Supabase and production acceptance.** The original implementation was verified without a Supabase project. Hosted project settings have since been supplied for a local migration review; no hosted connection or migration execution was attempted. No deployment, GitHub remote, commit or push was created. This report supersedes the earlier local portfolio report.

## 1. Features completed

**PASS locally:** database-backed service inquiry form with required contact/service/project/budget/consent fields; optional contact details, features, future deadline, urgency, notes and supporting files; inline validation, preserved failed input, real transfer progress, random confirmation reference and retry protection. The existing general message form/inbox remain available.

The same service source powers public cards, inquiry selection and CMS management. The migration includes the requested 22 offerings; no fictional clients, projects, biography, education, experience or awards were added. The premium dark/light redesign is implemented; its nine-part report is [DESIGN_REPORT.md](DESIGN_REPORT.md).

**BLOCKED:** live end-to-end inquiry submission to hosted Supabase.

## 2. Database changes

**PASS in local PostgreSQL:** both complete current migration files execute together. The upgrade preserves preexisting services/contact messages.

The second migration extends services and adds service_categories, inquiry_budget_ranges, service_inquiries, inquiry_attachments and inquiry_activity. It adds UUID/FK/check constraints, publication/archive behavior, historical service/budget snapshots, indexes, timestamps, private RLS, reservation/completion RPCs, persistent shared quotas and audit triggers. It creates a separate private inquiry storage bucket. A subsequent local review hardened per-object function ACLs and explicit schema/quota permissions without changing the original data model. See [the hosted-defaults review](SUPABASE_MIGRATION_REVIEW.md).

**BLOCKED:** applying these migrations and verifying their behavior on hosted Supabase.

## 3. New routes and components

Public routes: POST /api/inquiries, GET /api/catalog and /privacy. Existing /contact now contains project inquiry and general message choices.

Protected pages: /admin/inquiries and /admin/inquiries/[id]. Protected APIs: /api/admin/inquiries, /summary, /[id] and /[id]/attachments/[attachmentId]. Existing schema-driven CMS routes also manage service categories and inquiry budgets.

New components include InquiryForm, ContactExperience, SpamVerification, InquiryList, InquiryDetail, InquiryProvider, InquiryBadge and InquiryOverview. Shared inquiry schemas, file inspection and server data helpers live under src/lib. The maintenance/live-test scripts are documented in README.

**PASS:** Next production route generation and local route/privacy checks. **BLOCKED:** authenticated hosted browser integration.

## 4. Admin dashboard integration

**PASS locally:** one existing admin shell, new navigation/badge, six true database summary counts, unread indicator/recent inquiries, 20-row server-side pagination, four-field search, service/status/priority/date/archive filters, newest/oldest sorting, detailed requirements/contact information, all nine requested statuses, four separate admin priorities, private notes, read/unread, archive/restore and confirmed deletion.

Activity records important workflow changes and administrator identity. Attachments use authorized downloads. Copy email, email-client draft and credential-free HTTPS contact links are implemented; no fake email-send action exists.

The original UI/inquiry implementation's preservation check changed only existing CMS entity definitions and allowlisted content search. A subsequent review updated local migration permissions as documented above. Auth, Supabase clients, middleware, existing contact/media/message APIs and Cloudflare configuration remain unchanged.

## 5. Security controls

**PASS locally:** strict schemas, bounded multipart input, exact Origin mutation checks, mandatory bot verification code, active catalog/deadline/consent checks, persistent atomic quotas, random references, idempotency fingerprints, server-only secret access, RLS privacy, admin membership checks, safe errors, React escaping and private/no-store responses.

The current heuristic source secret-pattern scan passed. The production dependency audit returned **0 vulnerabilities**.

**FAIL / OPEN:** the full dependency audit retains **five high entries in one development-only lint dependency chain**, rooted in unpatched braces 3.0.3. It is documented, not suppressed. See [security advisory and assessment](SECURITY.md#dependency-finding--2026-10-15). An initially introduced older PostCSS dev dependency was upgraded to 8.5.30 before final checks; its advisory no longer appears.

**BLOCKED:** real Turnstile, hosted Auth/Storage, final domain/cookies and provider controls. **NOT TESTED:** independent penetration testing.

## 6. File upload implementation

**PASS locally:** maximum three attachments, 5 MiB each; TXT additionally limited to 1 MiB. PDF/JPEG/PNG/WebP signatures, UTF-8 text and DOCX ZIP structure checks reject disallowed formats, oversized files, malformed containers, common macros/embedded payload paths and unsafe filenames. Private paths contain independent UUIDs.

Uploads complete before the database row becomes visible in the CRM. Failure compensation removes attempted objects and pending records when possible; ambiguous completion is checked before deleting anything. Crash leftovers retain a private pending parent for the dry-run-by-default cleanup command. Administrator deletion removes files before the record; cleanup errors preserve the record for retry.

Downloads recheck membership and parent association and issue 60-second signed download links. Previously issued links remain bearer capabilities until expiry.

**BLOCKED:** actual hosted Storage upload/download/expiry and cleanup behavior. **NOT TESTED:** full DOCX/PDF semantic compatibility across office viewers or malware scanning. Signature/container validation is not antivirus.

## 7. Notification behavior

**PASS locally:** shared summary polling every 60 seconds and current filtered list polling every 30 seconds while visible, abort/cleanup, hidden-tab pause, backoff to five minutes after errors, local refresh after mutations and real unread badges. Failed refreshes retain the last loaded results with an error.

No public inquiry Realtime subscription exists. Polling is periodic, not guaranteed instantaneous. External inquiry email notifications are disabled and do not block database submissions. Supabase Auth recovery SMTP is a separate existing setup.

**BLOCKED:** live cross-client arrival/refresh acceptance against a configured database.

## 8. Responsive design improvements

**PASS:** automated no-horizontal-overflow matrix at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px for inquiry form/list/detail. Overview, CMS manager/editor, project cards and case study fixtures also pass at 320/768/1440px. Public routes pass desktop and emulated phone layout/navigation checks.

Dark/light axe checks run on eight component views in both desktop/mobile projects. Public/sign-in accessibility checks cover six real routes in each project. Mobile sidebar Escape/focus restoration and theme persistence pass. Representative dark/light public/admin and phone screenshots were visually inspected.

A compact real Turnstile widget is configured to fit narrow screens; the fixture verification stub does not test Cloudflare's actual challenge iframe. **BLOCKED:** that external challenge. **NOT TESTED:** physical-device Safari/Android, screen-reader sessions or all future administrator-entered content.

## 9. Tests performed

- Shared inquiry/CMS schemas, PH/international contact details, deadlines, consent, mass assignment, priorities, filters, pricing, file limits/signatures and filename sanitization.
- Exact PostgreSQL migrations, preservation, RLS/role grants, private storage policies, service activation/category visibility, new service publication, snapshots after deletion, reservation retry, quotas, completion/attachment association, admin updates/activity and summary privacy.
- HTTP controllers with external services explicitly mocked: authorization, cross-origin rejection, invalid input/files, confirmed persistence, duplicate/in-flight retries, quota/catalog errors, failed upload compensation and a lost completion response.
- Actual React component browser fixtures: form validation/failure/retry/confirmation, filter/pagination requests, private note/status/priority saves, deletion dialog, service editor, theme/keyboard/accessibility and responsive layouts.
- Existing portfolio public, auth-controller, CMS/database, HTTP and validation tests.

The fixtures are isolated under tests/ui and a loopback test server, outside Next production routes. They do not add an application mock login or fake production data. PGlite runs real PostgreSQL but stubs Supabase-owned Auth/Storage interfaces.

## 10. Actual test results

- **PASS:** ESLint with zero warnings.
- **PASS:** TypeScript, including next typegen; final standalone check and production build type checking.
- **PASS:** 112 Vitest tests across seven files, including both legacy-grant and strict explicit-grant/automatic-RLS database configurations.
- **PASS:** 34 Playwright tests; two intentionally skipped duplicate mobile executions of explicit viewport matrices already run in the desktop browser project.
- **PASS:** local built Worker smoke — 17 route/status/security-header checks, browser rendering, new charcoal CSS, admin redirect and zero browser runtime errors during the smoke flow.
- **PASS:** heuristic secret scan; production audit zero vulnerabilities.
- **FAIL / OPEN:** full development dependency audit described above.
- **BLOCKED:** test:live, test:live:inquiries and maintenance integration without project credentials. Live test commands fail closed rather than returning a fabricated success.

Initial browser failures exposed a light-theme contrast issue and outdated test selectors/heading whitespace assumptions; these were corrected. The final complete suites above passed. No live service result is labeled PASS.

The latest migration review reran unit/database tests, lint and type checking. Browser and Worker/build results below were obtained during the preceding UI/inquiry verification; this SQL/test-only review did not rerun browser or production builds.

## 11. Build results

**PASS:** Next.js production build, OpenNext Cloudflare production build and Wrangler deployment dry run. The dry run uploaded nothing.

Final Worker bundle: **9,816.60 KiB uncompressed / 2,014.94 KiB gzip**, with 33 static asset files. The generated production CSS was 73,725 bytes. Local workerd loaded the self-reference and asset bindings and served the routes successfully.

Next's Edge middleware deprecation and OpenNext's native Windows support warning remain documented. The intentional Edge middleware implementation is retained for adapter compatibility. **NOT TESTED:** included Linux CI on GitHub. No remote or deployment was created.

## 12. Remaining external configuration

Use your Supabase project and apply both migrations in filename order for a fresh application schema. Previously migrated deployments need a new forward permission migration for the subsequent hardening; do not replay an already applied initial migration. Disable public signup, create an Auth user and trusted admin_profiles membership, configure allowed origins/recovery redirects, and review the seeded service/budget catalogs.

Fill .env.local from [.env.example](../.env.example): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SITE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY and CONTACT_HASH_SECRET. Use actual project keys, a random hash secret, and a Turnstile widget registered for the intended hostname. Production checks both hostname and the contact/inquiry action.

Use a dedicated test project for opt-in live scripts with TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD and TEST_ALLOW_WRITES=true. The inquiry script additionally needs the server secret. It tests hosted database/catalog/Auth/Storage directly; actual CAPTCHA/form/browser acceptance remains required. Configure SMTP for Auth recovery, not as an inquiry-submission dependency.

See [README](../README.md#supabase-setup), [deployment](DEPLOYMENT.md), [database](DATABASE.md), [security](SECURITY.md) and [admin workflow](ADMIN_GUIDE.md).

## 13. Production blockers

**BLOCKED:** hosted migrations/Auth/RLS/Storage and authenticated UI acceptance; real Turnstile submission; signed-link expiry and failed-upload recovery; final domain/Worker secrets/cookies; real catalog edits and inquiry arrival without redeployment; recovery delivery; backup and retention operations.

**OPEN:** development lint-chain advisory. **NOT TESTED:** deployed performance/Core Web Vitals, physical devices, maximum-size multipart CPU/memory/latency, independent security review and real traffic quotas. The Free Worker CPU budget may be insufficient for SSR and large buffered uploads; measure before release. No automatic maintenance scheduler or external inquiry email provider is configured.

## 14. Final readiness assessment

**PASS — locally implemented and verified against the stated local harnesses. BLOCKED — production-ready acceptance until external configuration and live checks are completed.**

The portfolio redesign, CMS extension and inquiry workflow are concrete source changes in the existing application. The architecture remains Cloudflare + Supabase. Personal history remains editable and empty where not supplied. No secrets were hardcoded, no real client data was fabricated, and nothing was deployed or pushed.
