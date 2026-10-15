# Initial workspace audit — 2026-10-15

- The parent workspace contained only an empty `MaikuuuTech` subdirectory. No existing code, package manifest, environment file, assets, tests, documentation, Git repository, or database integration was present.
- No applicable ancestor or project AGENTS.md was found.
- Node 24.21.0, npm 11.19.0, and Git 2.54.0 were available. PowerShell blocks `npm.ps1`; `npm.cmd` works without changing execution policy.
- Docker CLI exists, but the Docker Linux engine was not running. No PostgreSQL CLI or Supabase project credentials were available.
- The user confirmed no Supabase project is configured and supplied the name **MaikuuuTech** and headline **Full-Stack Developer | Mobile Application Developer | IoT Enthusiast**. Other personal information must remain empty and editable.

## Architecture decision

Next.js 16.4.1, React 19.3.1, TypeScript, Tailwind 4, Supabase PostgreSQL/Auth/Storage, and OpenNext Cloudflare 1.20.12. Installed versions are locked in package-lock.json. The adapter's published peer range supports this Next version.

[Cloudflare's current guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/) recommends vinext for new Cloudflare projects. This project retains the user's expressly requested Next.js implementation using the documented manual OpenNext configuration. [OpenNext](https://opennext.js.org/cloudflare) supports Next.js 16 and App Router, but does not support Node.js middleware. Edge middleware is deliberately retained despite Next's deprecation warning. A Node-based proxy is not substituted silently. Future migration should be evaluated as a separate compatibility change.

Dynamic SSR, HTTP-based Supabase calls, and private Storage avoid filesystem writes, TCP database drivers, and optional paid image optimization. Public content is uncached between requests.

## Directory structure

- `src/app/(public)`: portfolio, section pages, project detail, contact.
- `src/app/admin`: sign-in, password updates, protected dashboard, content editors.
- `src/app/api`: authorized CMS, media, auth, and protected contact endpoints.
- `src/components`: reusable public and administration interfaces.
- `src/lib`: validation, repository access, authorization, Supabase clients, request and upload boundaries.
- `supabase`: reproducible migration and local stack configuration.
- `tests`, `e2e`, `scripts`, `docs`: verification, tooling, and operational guidance.

## Implementation phases

Foundation → public interface → database/RLS → authentication → CMS → private media → dynamic reads → contact protection → hardening → accessibility/SEO → automated tests and builds → documentation and deployment acceptance.

External blockers are Supabase project provisioning, production secrets, initial administrator, SMTP/recovery configuration, Turnstile widget, Cloudflare account/domain configuration, and live production verification. No production deployment or GitHub push is authorized.
