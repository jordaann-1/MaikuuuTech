# Security

## Implemented boundaries

- Authentication is verified server-side with `getUser()`. User-controlled metadata, email comparisons, local flags, and hidden controls never grant admin access.
- Membership is checked in server components, every admin endpoint, and PostgreSQL policies. An authenticated nonadmin cannot write portfolio records, upload files, or read messages.
- RLS is enabled on every public application table. Definer functions have explicit empty search paths and restricted execute grants. No unrestricted anonymous content/message write policies exist.
- CMS mutations require the exact configured Origin and JSON where applicable. Input is parsed through strict allowlisted schemas. Redirect destinations are fixed or generated from the configured site URL.
- Sessions use Supabase SSR cookies, SameSite=Lax, and Secure in production. Cookies remain readable by the Supabase client by design; they are not represented as HttpOnly. Edge middleware refreshes sessions; each protected handler independently revalidates authorization. Admin responses are not cached.
- File uploads require admin status, a content length, a 10 MiB limit, matching MIME/signature, randomized names, and an approved format. SVG/HTML/executable uploads are rejected. Signature checks are not malware scanning. Administrators remain responsible for trusting PDF content.
- Contact messages use server validation, a honeypot, mandatory Turnstile, 5 messages per IP/hour and 100 global/hour enforced atomically in PostgreSQL. Counters contain keyed IP hashes, not raw addresses. Verification/body requests are bounded and database errors are sanitized.
- CSP, frame denial, nosniff, referrer and permissions policies, production HSTS, safe error pages, React text escaping, and noindex admin headers are included. CSP permits inline scripts/styles because Next SSR and Turnstile require them in this implementation. It is defense in depth, not a strict nonce CSP. Do not accept unsanitized HTML or third-party scripts.

## Password recovery

Set Supabase Auth Site URL to the exact HTTPS public origin. Add `/auth/confirm` and `/admin/update-password` on that origin to the redirect allowlist, plus localhost for development only.

Customize the **Reset Password** email template to use a recovery token hash:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

`/auth/confirm` accepts only recovery OTPs and redirects to the fixed password route. The password screen still requires trusted admin membership. New passwords need at least 12 characters. After a successful change, the application requests global sign-out. Test email delivery, link expiry, duplicate-link rejection, successful update, and sign-in with the new password on your real project.

Keep secure password change enabled. Configure production SMTP and Auth rate limits in Supabase. Free default email delivery is restricted; it is not a production mail service guarantee. There is no email notification service for contact submissions: messages are stored for the admin inbox.

## Secret management

Use `.env.local` locally and Cloudflare secret bindings in production. Never prefix secret keys with `NEXT_PUBLIC_`. The runtime uses no legacy service-role JWT environment variable; `SUPABASE_SECRET_KEY` is used by server-only contact/inquiry submission and the maintenance script. Cloudflare/Supabase CLI login credentials remain outside application source.

`npm run secrets:scan` checks source for common secret/key/token signatures without printing matches. It is heuristic, not an assurance that every credential format is detected. Inspect Git changes and dependency advisories before release. Rotate any accidentally committed or disclosed credential.

## Remaining production acceptance

### Dependency finding — 2026-10-15

The production dependency audit (`npm audit --omit=dev`) reports zero known advisories after overriding the OpenNext build chain's glob dependency to patched 10.5.0. The **full** audit reports five high-severity entries in one development dependency chain: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` 3.0.3. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) describes stack exhaustion from deeply nested patterns and lists no patched version. The registry's latest braces release remains 3.0.3 at verification time. These tools are not application request handlers, but the finding remains **open**; the repository does not claim a clean full dependency audit. Do not run lint tooling on untrusted patterns. Recheck and update the compatible lint chain when upstream publishes a fix. Do not apply npm's proposed downgrade to Next.js 14 lint tooling without compatibility review.

The glob override is a compatible patch within its existing major release, retained in the lockfile. No audit findings are suppressed or hidden.

Configure and test the real Supabase database/Auth/Storage, SMTP, Turnstile, domain and environment bindings. Confirm anonymous/nonadmin behavior using a dedicated project; verify published-to-draft transitions and signed URL expiry. Load test the Cloudflare CPU budget. Restrict Supabase project membership, enable account MFA, and establish backups/retention. These external controls cannot be claimed verified from a local unconfigured checkout.

## Confidential inquiry controls

The public endpoint requires exact same-origin multipart requests, a 15 MiB + 128 KiB streamed body bound, strict fields, consent, current active catalog IDs, and a verified Turnstile token. The production hostname and `inquiry` action must match. Rate quotas live in PostgreSQL, shared with general messages; they do not rely on Worker process memory. The connection address is HMACed with CONTACT_HASH_SECRET; raw IPs and form bodies are not logged by application code. Use Cloudflare's trusted client-IP header only behind Cloudflare.

References contain 128 random bits, prefixed MKT-, and no public lookup endpoint exists. Retry confirmation requires the same random submission nonce, normalized payload/file fingerprint and actor hash. Concurrent in-flight retries receive a conflict instead of uploading a second file set. The secret key is never imported into a client component or used for normal administrator writes.

Three files maximum, 5 MiB each; plain text has a stricter 1 MiB limit. Allowed types are PDF, JPEG, PNG, WebP, UTF-8 TXT and DOCX. MIME and signatures must agree. DOCX ZIP central-directory checks require document/content-type entries, bounded entry count/uncompressed size and safe internal paths; encrypted containers, common macros/embedded payload paths and malformed offsets are rejected. Filenames are normalized, stripped of paths/control characters, length bounded, and assigned a canonical extension. Paths use independent UUIDs.

These checks are **not antivirus or full document semantic validation**. PDF scripts, hostile links, malformed yet signature-matching media and document exploits require appropriate endpoint protection or an additional scanning provider. No scanning service is configured or falsely claimed. Avoid enabling active content when opening unfamiliar downloads.

Documents remain in a private bucket. Each download rechecks administrator membership and attachment-to-inquiry association before issuing a download URL valid for 60 seconds. Signed links are bearer capabilities during that interval; previously downloaded copies cannot be revoked. See [Supabase private bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals) and [signed downloads](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).

Private notes are excluded from public responses and inquiry list queries. Detail/API responses are private/no-store; text is React-escaped and external contact links open only credential-free HTTPS URLs with noopener/noreferrer. No raw HTML renderer is added. Mail actions open the administrator's email client and do not claim delivery.

The public privacy notice is at /privacy and is required by form consent. Limit collection, review retention regularly, restrict provider project access, and arrange appropriate backup handling. Failed-upload compensation and the dry-run maintenance tool reduce orphan retention; a crashed Worker cannot provide atomic rollback across PostgreSQL and Storage.

## Notification and verification limits

External email notifications are disabled; no SMTP/provider secrets or fake sending controls are added. Supabase Auth recovery SMTP is a separate existing configuration. Configure a real notification provider and delivery/error handling before adding an external notification claim. Inquiry storage never depends on email availability.

Hosted Auth, Storage signed-link enforcement, real Turnstile, final-domain cookies, backup/retention behavior and upload CPU/memory are BLOCKED pending configured services. Local PostgreSQL policy tests stub Supabase-owned auth/storage interfaces. Fixture browser tests stub network services explicitly and do not authenticate against Supabase.
