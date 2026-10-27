# Sporting Hub Hong Kong

Next.js App Router site using React, TypeScript and Tailwind CSS v4. The existing venue design, English/Traditional Chinese content and booking layout are preserved. Venue bookings and class enrollments use the Bliss API; personal-training flows use sample data.

## Development

Requires Node.js 22.13 or later and pnpm 11.20.0 (pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

Open http://localhost:3001/en/ for English or http://localhost:3001/zh-HK/ for Hong Kong Chinese. Each locale includes the home, `coming-soon/`, `booking/` and `terms/` pages. Booking accepts the existing `mode=venue|class|pt`, `court` and `t` query parameters. `?view=dev` enables the original review annotations.

Booking steps have separate routes under `/[locale]/booking/`: the root selects a sport/category/coach, `group/` selects a personal-training group, `classes/` selects a class, then `time/`, `details/`, `payment/`, and `confirmation/` cover the remaining steps. The shared booking layout stays mounted as browser history changes. Every step is statically exported, and unprefixed step links redirect to English while preserving their query string.

Venue URLs carry `serviceId`, the resolved backend `roomId`, `date` (`YYYY-MM-DD`), and `time` (one hour or two adjacent comma-separated start times). For example, `/en/booking/details/?mode=venue&serviceId=373&roomId=135&date=2026-10-24&time=23%3A00%2C00%3A00`. `date` is the evening date used by the grid; `00:00`–`06:00` belong to the following day. `court` and `courtSize` retain the website sport/variant. Legacy `t` links still work. Class and training URLs carry their category/class or coach/group selections as well.

Reloads, language switches, and browser back/forward restore and validate these selections. A missing/invalid service, room, date, time, or newly unavailable slot returns the flow to the appropriate selection step. Customer fields and waiver state are held in a two-hour session draft for the same selection, never added to the URL. Venue payment and confirmation routes carry `checkoutId` and restore their authoritative status from the API. A confirmed booking always returns to its receipt, including through browser history. Unpaid holds can be cancelled with Back before payment begins. The guest bearer is held in session storage (memory when storage is blocked), never in a query string. KPay returns it in a URL fragment, which is removed immediately and used to restore the booking. A copied payment URL without that bearer cannot reveal customer details or pay. Class enrollment uses the same deferred confirmation behavior; personal training retains its demonstration payment step.

Translations use `next-intl` with catalogs in `messages/en.json` and `messages/zh-HK.json`. Locale prefixes are required, and the URL determines the language on the server and in the browser. The language links retain the current page, query parameters and section anchor. Unprefixed and original `.html` URLs redirect to English while retaining query parameters and anchors. Both locales are statically generated; locale detection middleware is not needed.

Development and production scripts use Next.js's Webpack compiler for compatibility with restricted development environments.

## Validation and production

```sh
pnpm typecheck
pnpm build
pnpm test:smoke
pnpm preview
```

To validate an isolated export while a dev server is running, use `SMOKE_OUTPUT_DIR=/absolute/path/to/out pnpm test:smoke`.

The build exports the complete site to `out/`, including both locales, assets, `.nojekyll` and compatibility files for `booking.html`, `coming-soon.html` and `terms.html` at the root and under each locale. Deploy the contents of `out/` to a static host such as GitHub Pages. Set GitHub Pages to deploy a build artifact rather than the source checkout. `pnpm preview` serves the exported site locally on port 3001; set `PORT` to change its port. `next start` is not used with static exports.

For a repository subpath, set `NEXT_PUBLIC_BASE_PATH` before building, for example `/sportinghub-website`. Set `NEXT_PUBLIC_SITE_URL` to the full public URL (including that subpath) for canonical and social metadata. See `.env.example`. Use the same base path when running the preview. These values are embedded at build time.

## Production Docker image

```sh
docker build -t sportinghub-website:prod .
docker run --rm -p 8080:8080 sportinghub-website:prod
```

Open http://localhost:8080. The multi-stage image builds Next.js standalone output with pnpm and runs its production Node.js server as an unprivileged user. Only traced runtime dependencies, public files and built assets are copied into the final image. The container health check requests the English homepage, including the configured base path. Next.js handles 404 responses, asset caching and legacy `.html` aliases.

Docker sets `NEXT_OUTPUT=standalone` and builds directly with `next build`, bypassing the static-export postbuild hook. The normal `pnpm build` and `pnpm preview` workflow continues to use `out/` for static hosting.

Pass the public URL and optional subpath when building for your production host:

```sh
docker build -t sportinghub-website:prod \
  --build-arg NEXT_PUBLIC_SITE_URL=https://sports.example.com/sportinghub/ \
  --build-arg NEXT_PUBLIC_BASE_PATH=/sportinghub .
```

The locale pages are then served at `/sportinghub/en/` and `/sportinghub/zh-HK/`. Local `.env` files are excluded from the Docker build context; use these build arguments. Rebuild the image to change public values, since they are embedded in the build. Terminate HTTPS at your reverse proxy or load balancer.

## Source layout

- `app/`: routes, metadata, document layout and Tailwind entrypoint.
- `components/`: React page content, shared SVG illustrations and browser lifecycle component. The home and coming-soon routes share `HomePage`.
- `i18n/` and `messages/`: next-intl configuration, locale routing, metadata and English/Hong Kong Chinese catalogs.
- `lib/data.js`: booking structure and availability sample data.
- `lib/site-runtime.js`: existing booking state machine and browser interactions, scoped to a component mount with cleanup.
- `styles/`: brand tokens and Tailwind component styles; custom selectors preserve the original illustrations, responsive layouts and UI states.
- `public/assets/`: original venue photos, logos and court diagrams.

## Venue backend data

`/booking/?mode=venue` reads the Bliss API in the browser. Set `NEXT_PUBLIC_BOOKING_API_URL` (for example `http://localhost:3003`) before building. For Docker, pass `--build-arg NEXT_PUBLIC_BOOKING_API_URL=https://your-api-host`. The API must allow the website origin via CORS.

For local development, put `NEXT_PUBLIC_BOOKING_API_URL=http://localhost:3003` in `.env.local`, or copy `.env.example` to `.env.local`. Next.js does not load `.env.example` itself. If the dev server does not pick up the change, restart `pnpm dev` and refresh the page.

Configure the venue mapping in `.env.local` using the variables in `.env.example`. `NEXT_PUBLIC_BOOKING_TENANT_ID` selects the tenant for both venue bookings and class enrollment (defaults to **3**). `NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID` and `NEXT_PUBLIC_VENUE_VB_B_SERVICE_ID` map volleyball courts A/B; `NEXT_PUBLIC_VENUE_FB_A_SERVICE_ID` and `NEXT_PUBLIC_VENUE_FB_B_SERVICE_ID` map football courts A/B. The other sports use `NEXT_PUBLIC_VENUE_BB_SERVICE_ID`, `NEXT_PUBLIC_VENUE_PB_SERVICE_ID`, `NEXT_PUBLIC_VENUE_BD_SERVICE_ID`, `NEXT_PUBLIC_VENUE_DB_SERVICE_ID`, and `NEXT_PUBLIC_VENUE_TQ_SERVICE_ID`. Set each to a positive integer backend service ID; leave it empty or unset to make that court unavailable. Invalid IDs cause a configuration error. Linked rooms are read from the backend; IDs are never inferred from names or list positions.

For Docker, pass these as build arguments, for example `--build-arg NEXT_PUBLIC_BOOKING_TENANT_ID=3 --build-arg NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID=372`. Service IDs default to empty in Docker, so pass every court you want enabled. These public variables are embedded in the browser bundle; rebuild the site/image after changing them. Runtime `docker run -e` values cannot change the browser bundle.

Use `GET /public/place/services?tenantId=3` to find IDs. In the dashboard, enable place bookings on each service, configure its prices and linked rooms, and turn on both frontend visibility and frontend booking. Disabled/deleted services and rooms do not appear. Court A/B may use separate services when they have different prices. Configure shared physical rooms in the dashboard so conflicts are respected; no room IDs belong in the website mapping.

The website loads rates from these services and hours from `GET /public/place/availability?tenantId=3&serviceId=123&date=2026-10-24`. The date is the Hong Kong evening date: hours run from 07:00 through 06:00 the following day. Prices use backend peak schedules and dashboard holidays; availability includes place bookings, service reservations, lessons and room blocks. If a service has multiple linked rooms, an hour is available if any room is free, and a two-hour selection must fit in the same room throughout. Loading/errors disable selection and provide a retry; there is no sample-data fallback. Rebuild after editing the mapping or public environment variables.

Venue steps now use these APIs:

- **Time:** `GET /public/place/quote` rechecks the selected service, room and Hong Kong timestamps, returning the authoritative price and availability.
- **Details:** `POST /public/place/checkouts` validates contact details and terms, creates the guest link, place booking and unpaid invoice together, and holds the room for 15 minutes. Retries use the same random session token to avoid duplicate bookings. The server rejects changed prices or conflicts without partial records.
- **Confirmation:** `POST /public/place/checkouts/:id/payment` currently confirms without KPay and returns `checkoutUrl: null`. The invoice keeps the quoted total, $0 received, and the full balance due; the invoice item also has $0 paid. The checkout becomes `Confirmed`, retains its room reservation, and shows the real invoice reference and received/outstanding amounts after refresh. It is not marked paid.

No additional booking fields or tables are required. Customer data uses the backend `User` table. Booking IDs use existing invoice references; guest access and lifecycle use the existing payment `sessionId`/`status`, hold expiry uses invoice `createdAt`, and cancellation uses `cancelledAt`. The API returns no user profile details; receipts use the browser's own contact draft where available. If the superseded invoice online-booking-column migration was already applied, run `prisma/cleanup-online-booking-fields.sql`, regenerate Prisma and restart the API. Current venue confirmation needs no KPay merchant credentials or payment return URL. The existing quoted prices still apply; payment collection is deferred.

Unconfirmed holds expire automatically after 15 minutes. Confirmed bookings keep their room reservation and outstanding invoice. Existing gateway orders from before this change still require server verification and cannot use deferred confirmation to bypass a payment already in progress. No real door-access code or email delivery is provided by this API, so confirmation does not display a demo QR or promise an email. Personal training retains its sample data.


## Class enrollment API

`/booking/classes/` (and its locale routes) now loads real course sessions for `NEXT_PUBLIC_BOOKING_TENANT_ID` through `GET /public/enrollment/courses`. Backend category IDs drive the category and secondary filters. Course-priced bookings show one card for the entire course with its full price, date range, lesson count and complete schedule. Lesson-priced bookings show individual sessions with a per-lesson price. The page displays actual coaches, rooms and remaining capacity, with retry controls and no demo fallback.

Select a course or lesson to obtain an authoritative quote. A non-null `pricePerCourse` means the entire course; otherwise the backend uses `pricePerLesson`. A full-course booking includes every active scheduled lesson, including earlier dates in an ongoing course, and charges the full course price once. It reserves all lesson seats or none. The details step creates one invoice/item and all real `LessonEnrollment` records atomically, with a 15-minute temporary seat hold. Expiry/cancellation releases every held seat. Courses whose entire schedule has elapsed cannot be purchased. Free prices are supported. The confirmation step keeps the booking, records **$0 received**, and leaves the full invoice balance outstanding; it does not call KPay. Refresh and browser history restore the saved enrollment with its private guest session and real invoice reference.

Single-lesson links carry `lessonId`, `courseId`, `date`, and `time`; full-course links carry `courseId` without `lessonId`, with the first lesson's date/time. `classId` remains a lesson-ID alias. Course receipts list all lessons, and the calendar download includes every lesson; the Google Calendar link adds the first lesson and is labeled accordingly. No customer data or guest bearer is added to query strings. Classes use backend records directly and only need the shared `NEXT_PUBLIC_BOOKING_TENANT_ID`, without any venue service mapping.

The class API uses existing invoice/payment/enrollment fields and needs no new schema migration. For installations with the superseded extra online-booking columns, apply `prisma/cleanup-online-booking-fields.sql`, regenerate Prisma, build and restart the API. Use the existing `NEXT_PUBLIC_BOOKING_API_URL` setting. Configure courses with either `pricePerCourse` or `pricePerLesson`, scheduled lessons, active rooms/branches, and participant capacity. Coach assignment is optional for enrollment; once coaches are assigned, their coach-to-student ratio also limits capacity. See `bliss-dashboard-api/prisma/CLASS-ENROLLMENTS.md` for endpoint and hold behavior.
