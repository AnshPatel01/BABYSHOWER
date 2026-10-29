# A little celebration

Botanical baby shower invitation with automatic 3D doors and email-only RSVPs. No database, dashboard, analytics, or stored guest responses. Node 22+, no runtime dependencies.

## Develop

Run `npm ci` and `npm run dev` (port 3000). Run `npm test` for validation, email isolation, sanitization, provider failures, and abuse checks.

Edit `public/config.js` before sharing: parents, dates, venue, address, message and registry links are sample content. Dates include timezone offsets; keep display labels in sync. Calendar downloads use UTC. Fonts use Google Fonts with serif/sans-serif fallbacks. Artwork is inline SVG.

## Email configuration

Copy `.env.example` to ignored `.env` locally, or use secure deployment environment settings:

- `RESEND_API_KEY`: Resend sending key.
- `RSVP_FROM`: sender on a domain verified with Resend.
- `RSVP_TO`: host inbox.
- `SITE_ORIGIN`: exact website origin without trailing slash; locally `http://localhost:3000`.

Restart after changing variables. Missing configuration blocks sending and never shows a success confirmation. Provider acceptance does not guarantee inbox delivery. Real email sending requires credentials and has not been verified yet; verify one accepted and one declined live test in the host inbox before sharing.

## Deploy

Import into Vercel with Other framework preset, no build command and no output-directory override. `vercel.json` serves public assets and `api/rsvp.js` is the serverless endpoint. Configure the four variables with your production origin. Alternatively run `npm start` on a Node host behind HTTPS; `PORT` is supported. Never expose the API key in public files.

The endpoint validates requests, limits payloads, checks exact origin and a honeypot, and escapes guest HTML. Resend idempotency keys protect retries of unchanged responses within the provider's 24-hour window. Retry payloads retain their original submission timestamp so Resend receives identical content for the same idempotency key. The browser disables repeated taps and keeps the submission key in memory only; refreshing creates a new key. No guest data is persisted by this application or saved to browser storage.

An ephemeral per-instance limiter stores hashed IPs and counts for ten minutes. Vercel's platform IP header is used on Vercel; standalone uses socket IP. Limits are best-effort across cold starts and replicas. Configure platform firewall/rate-limiting rules on POST `/api/rsvp` for stronger public abuse protection. Do not trust arbitrary forwarded headers on another host. Provider transmission logs may include the individual email; application code does not log response content.

Door animation plays once per tab session using a flag containing no guest data, can be skipped, and respects reduced motion. Main content exists without JavaScript; RSVP and calendar download require JavaScript. All content reveals use transforms and opacity.

## Before sharing

Replace sample details and registry destinations. Configure email and a verified sender, run tests, and confirm separate accepted and declined emails reach the host. Check mobile layout and keyboard navigation. No admin interface or overall attendance totals are created.

## Verification in this workspace

All 13 automated RSVP tests pass, using a mocked email provider. JavaScript syntax checks pass. A local HTTP smoke check was blocked because this environment forbids binding a listening port (EPERM). Browser visual verification and live inbox delivery have not been performed.
