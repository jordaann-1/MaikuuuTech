# Architecture

## Request and update flow

Browser → Next.js App Router running on Cloudflare Workers → Supabase HTTPS APIs → PostgreSQL RLS / Auth / private Storage.

Public server components use a sessionless publishable-key client. They explicitly filter published records; database policies independently enforce visibility. An administrator viewing the public site sees the same published content as an anonymous visitor, rather than accidentally receiving drafts through an admin session.

Admin server layouts and every admin API call verify the user through Supabase `getUser()`, then require a trusted `admin_profiles` row. Normal data mutations retain the user's token so database RLS also applies. The secret API key is reserved for contact/inquiry submission and stale-upload cleanup and never used to bypass content-management authorization.

Forms use shared entity definitions and Zod schemas. The API selects the table from a fixed allowlist, rejects unknown fields, and handles validation and database errors safely. Project and gallery/technology updates run through one SECURITY INVOKER transaction; a failed child write rolls back the complete update. Content is plain text rendered through React escaping; arbitrary HTML is not supported.

## Fresh content

The public route group is `force-dynamic` with `revalidate=0`. Supabase fetches use `no-store`. React `cache()` deduplicates reads only within a request. There is no persistent HTML/data cache, ISR dependency, R2 cache, realtime subscription, or redeploy step for publishing. Existing tabs update on normal navigation or refresh; unsolicited live replacement of an already open page is not promised.

## Media

Private `portfolio` bucket → authenticated upload with randomized UUID path → content reference → conditional public read policy. `/api/media/...` validates paths and requests a signed URL with a 60-second lifetime. Public access requires a published reference; administrators can preview unpublished uploads. Replacing a file always creates a fresh path. Detached files can be removed through the media library; referenced files cannot be deleted.

Signed URLs already issued can remain usable for up to 60 seconds after unpublishing. A downloaded copy cannot be revoked. Do not upload confidential documents as portfolio assets.

## Contact

Same-origin JSON submission → strict field/body validation → Turnstile verification → HMAC of Cloudflare's client IP → server-only RPC → atomic global/IP hourly quotas and private message insertion. No direct anonymous insert/read policy exists. The endpoint fails closed on configuration, verification, or database failures. Local development deliberately shares a single rate-limit identity when Cloudflare's trusted header is absent.

## Portability

No Node filesystem writes or persistent in-process state occur in request handlers. Supabase is reached over HTTPS; no database connection pool or raw socket is required. No paid image binding is mandatory. Uploads should be sensibly sized before publishing; original image dimensions and lazy loading are provided, but automatic image transformation is not enabled on the free-tier path.

The OpenNext adapter is build tooling; app code remains ordinary Next.js. The adapter's Edge middleware limitation is recorded in the initial audit and deployment guide.

## Inquiry transaction and delivery

The existing services table supplies both public service cards and inquiry selections. Public server reads use the anonymous client, so archived/inactive services and unpublished categories remain excluded even when the viewer has an admin cookie. Catalog and budget refreshes use `GET /api/catalog`, without a persistent cache.

The project form validates the shared Zod schema and sends bounded multipart data to `POST /api/inquiries`. The server checks Origin, body/field limits, file signatures, consent and dates, computes an HMAC actor identity and normalized request/file fingerprint, and verifies Turnstile. A random browser submission nonce is retained for retries. A matching complete submission returns its existing reference without inserting again or consuming another CAPTCHA.

The server-only `reserve_inquiry` RPC atomically checks the current service/budget and combined contact/inquiry hourly quotas, snapshots catalog labels, and creates a private pending row. Files upload to randomized paths under that row's UUID in the private inquiry bucket. `complete_inquiry` atomically associates up to three files and marks the row complete. Only complete rows appear in the CRM. The response exposes only the random public reference, never the internal UUID or message details.

PostgreSQL and object storage are separate transactions. Failed uploads trigger compensation; the server checks completion before cleanup so a lost success response cannot delete committed files. Storage cleanup failure retains the pending parent for recovery. Process crashes can leave pending objects: the separate maintenance command cleans rows older than 24 hours, with dry run as default. It is not an automatically configured scheduler.

## Protected CRM and refresh

Server pages and every inquiry/attachment API independently verify trusted membership. Admin list queries filter/search server-side and return 20 rows; details return the selected inquiry, associated file metadata, and latest 100 activity events. Admin patches allow only status, priority, notes, read and archive flags. Database triggers record status/priority/note/archive changes with the authenticated administrator's identity.

The shell shares one summary polling provider. Statistics/unread/recent refresh every 60 seconds; the visible list refreshes its current filtered page every 30 seconds. Timers pause for hidden tabs, requests abort on cleanup, and failures back off to five minutes. Mutations request a refresh through a local browser event. No public Realtime channel or external notification delivery exists.

## Visual system

Geist and Geist Mono are self-hosted licensed WOFF2 assets through `next/font/local`. Semantic CSS variables define charcoal surfaces, restrained blue accents, light-theme counterparts, spacing, borders, radii, and motion. A pre-paint theme preference avoids an initial wrong theme; only theme preference is stored locally. The hero is a code-native SVG illustration. Project case studies, publication tables, grouped editors and the CRM share these tokens and support reduced motion.
