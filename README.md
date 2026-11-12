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

Reloads, language switches, and browser back/forward restore and validate these selections. A missing/invalid service, room, date, time, or newly unavailable slot returns the flow to the appropriate selection step. Customer fields and waiver state are held in a two-hour session draft for the same selection, never added to the URL. Venue payment and confirmation routes carry `checkoutId` and restore their authoritative status from the API. A confirmed booking always returns to its receipt, including through browser history. Unpaid holds can be cancelled with Back before payment begins. The guest bearer is held in session storage (memory when storage is blocked), never in a query string. KPay returns it in a URL fragment, which is removed immediately and used to restore the booking. A copied payment URL without that bearer cannot reveal customer details or pay. Venue bookings, classes and personal training use KPay and show confirmation only after server-verified payment. An unpaid booking is a temporary hold.

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

Production pages check `/version.json` on load, every minute while visible, and when returning online or focusing the tab. A newer build triggers a full refresh of the current URL. Checks wait while visiting booking routes or editing an input, and a session guard limits automatic reloads to once every five minutes. Network errors leave the page usable. Browsers that block session storage skip automatic reloads to prevent loops. This applies to clients loaded after this feature is deployed; already-open older clients need one manual refresh. Deploy each build as one artifact across replicas, and configure any CDN to avoid caching `/version.json`.

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

Configure the venue mapping in `.env.local` using the variables in `.env.example`. `NEXT_PUBLIC_BOOKING_TENANT_ID` selects the tenant for both venue bookings and class enrollment (defaults to **3**). `NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID` and `NEXT_PUBLIC_VENUE_VB_B_SERVICE_ID` map volleyball courts A/B; `NEXT_PUBLIC_VENUE_FB_A_SERVICE_ID` and `NEXT_PUBLIC_VENUE_FB_B_SERVICE_ID` map football courts A/B. Badminton, dodgeball and Teqvoly also have separate A/B mappings: `NEXT_PUBLIC_VENUE_BD_A_SERVICE_ID` / `NEXT_PUBLIC_VENUE_BD_B_SERVICE_ID`, `NEXT_PUBLIC_VENUE_DB_A_SERVICE_ID` / `NEXT_PUBLIC_VENUE_DB_B_SERVICE_ID`, and `NEXT_PUBLIC_VENUE_TQ_A_SERVICE_ID` / `NEXT_PUBLIC_VENUE_TQ_B_SERVICE_ID`. Basketball and pickleball use `NEXT_PUBLIC_VENUE_BB_SERVICE_ID` and `NEXT_PUBLIC_VENUE_PB_SERVICE_ID`. Set each to a positive integer backend service ID; leave it empty or unset to make that court unavailable. Invalid IDs cause a configuration error. Linked rooms are read from the backend; IDs are never inferred from names or list positions.

For Docker, pass these as build arguments, for example `--build-arg NEXT_PUBLIC_BOOKING_TENANT_ID=3 --build-arg NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID=372`. Service IDs default to empty in Docker, so pass every court you want enabled. These public variables are embedded in the browser bundle; rebuild the site/image after changing them. Runtime `docker run -e` values cannot change the browser bundle.

Use `GET /public/place/services?tenantId=3` to find IDs. In the dashboard, enable place bookings on each service, configure its prices and linked rooms, and turn on both frontend visibility and frontend booking. Disabled/deleted services and rooms do not appear. Court A/B may use separate services when they have different prices. Configure shared physical rooms in the dashboard so conflicts are respected; no room IDs belong in the website mapping.

The website loads rates from these services and hours from `GET /public/place/availability?tenantId=3&serviceId=123&date=2026-10-24`. The date is the Hong Kong evening date: hours run from 07:00 through 06:00 the following day. Prices use backend peak schedules and dashboard holidays; availability includes place bookings, service reservations, lessons and room blocks. If a service has multiple linked rooms, an hour is available if any room is free, and a two-hour selection must fit in the same room throughout. Loading/errors disable selection and provide a retry; there is no sample-data fallback. Rebuild after editing the mapping or public environment variables.

Venue steps now use these APIs:

- **Time:** `GET /public/place/quote` rechecks the selected service, room and Hong Kong timestamps, returning the authoritative price and availability.
- **Details:** `POST /public/place/checkouts` validates contact details and terms, creates the guest link, place booking and unpaid invoice together, and holds the room for 15 minutes. Retries use the same random session token to avoid duplicate bookings. The server rejects changed prices or conflicts without partial records.
- **Payment:** `POST /public/place/checkouts/:id/payment` accepts the session bearer and `{ redirectUrl }`. It creates one KPay order and returns its signed `checkoutUrl`, or resumes the existing order on retry. The booking stays `Pending`, with $0 received and the full balance due, until a server-to-provider check verifies the order ID, HKD currency and exact amount. Successful verification settles the invoice/items and changes the checkout to `Paid`. Truly free bookings confirm without a gateway order; legacy unpaid confirmations are treated as holds until the balance is paid.

No additional booking fields or tables are required. Customer data uses the backend `User` table. Booking IDs use existing invoice references; guest access and lifecycle use private `booking` metadata in the existing invoice JSON, hold expiry uses invoice `createdAt`, and cancellation uses `cancelledAt`. The API returns no user profile details; receipts use the browser's own contact draft where available. If the superseded invoice online-booking-column migration was already applied, run `prisma/cleanup-online-booking-fields.sql`, regenerate Prisma and restart the API. Priced venue checkout requires the selected room branch’s KPay merchant ID/signing key and API `KPAY_API_URL`. `NEXT_PUBLIC_KPAY_REDIRECT_URL` in the website environment sets the return page for both venue and PT checkout; no API redirect environment setting is required. Quotes report `paymentMode: kpay` and whether the branch has payment credentials, without exposing those credentials.

Unpaid holds expire after 15 minutes until payment initiation begins. Once a gateway request starts, its pending marker protects the room and prevents a second charge even if the response is lost. Existing orders can be resumed; provider-expired or cancelled orders release the room. An initiation with no recorded order ID needs reconciliation before another charge can start. An unpaid legacy confirmation is also a hold and expires under the same rules. No real door-access code or email delivery is provided by this API, so confirmation does not display a demo QR or promise an email. Personal training uses the real service catalog and prices; its date/time availability uses reservation v4; payment uses the reservation v4 KPay flow described below.


## Class enrollment API

`/booking/classes/` (and its locale routes) now loads real course sessions for `NEXT_PUBLIC_BOOKING_TENANT_ID` through `GET /public/enrollment/courses`. Backend category IDs drive the category and secondary filters. Course-priced bookings show one card for the entire course with its full price, date range, lesson count and complete schedule. Lesson-priced bookings show individual sessions with a per-lesson price. The page displays actual coaches, rooms and remaining capacity, with retry controls and no demo fallback.

Select a course or lesson to obtain an authoritative quote. A non-null `pricePerCourse` means the entire course; otherwise the backend uses `pricePerLesson`. A full-course booking includes every active scheduled lesson, including earlier dates in an ongoing course, and charges the full course price once. It reserves all lesson seats or none. The details step creates one invoice/item and all real `LessonEnrollment` records atomically, with a 15-minute temporary seat hold. Expiry/cancellation releases every held seat. Courses whose entire schedule has elapsed cannot be purchased. Free prices are supported. The payment step creates or resumes a KPay order for the complete invoice. The reservation remains held until the API verifies the order, HKD currency and exact amount; then the invoice/items are settled and confirmation appears. Refresh and browser history restore the saved enrollment with its private guest session and real invoice reference.

Single-lesson links carry `lessonId`, `courseId`, `date`, and `time`; full-course links carry `courseId` without `lessonId`, with the first lesson's date/time. `classId` remains a lesson-ID alias. Course receipts list all lessons, and the calendar download includes every lesson; the Google Calendar link adds the first lesson and is labeled accordingly. No customer data or guest bearer is added to query strings. Classes use backend records directly and only need the shared `NEXT_PUBLIC_BOOKING_TENANT_ID`, without any venue service mapping.

The class API uses existing invoice/payment/enrollment fields and needs no new schema migration. For installations with the superseded extra online-booking columns, apply `prisma/cleanup-online-booking-fields.sql`, regenerate Prisma, build and restart the API. Use the existing `NEXT_PUBLIC_BOOKING_API_URL` setting. Configure courses with either `pricePerCourse` or `pricePerLesson`, scheduled lessons, active rooms/branches, and participant capacity. Coach assignment is optional for enrollment; once coaches are assigned, their coach-to-student ratio also limits capacity. See `bliss-dashboard-api/prisma/CLASS-ENROLLMENTS.md` for endpoint and hold behavior.

### Personal training service selection

Set `NEXT_PUBLIC_PT_CATEGORY_ID=1790` and `NEXT_PUBLIC_PT_BRANCH_ID=14` in `.env.local` to map S&C to the **Personal Training 個人訓練** service category and automatically use branch 14. The PT flow has no branch picker; URL parameters cannot override the configured branch. The tenant comes from `NEXT_PUBLIC_BOOKING_TENANT_ID`. The selection page loads `GET /public/catalog/services?tenantId=3&categoryId=1790` and displays all non-deleted services in that category, regardless of their frontend visibility or booking settings, using their English/Chinese names. The API resolves the mapped category ID within the tenant before matching the service's stored category fields; the website does not match category names or guess service IDs. Missing configuration, empty catalogs and API failures never fall back to sample coaches.

Service names such as `個人訓練: Adult 1 on 2` are grouped by `Adult` on the first step; the ratio step lists only that group's configured ratios (`1 on 1`, `1 on 2`, `1 on 3`). Choosing a ratio selects its exact backend service ID. Names without a ratio, such as Sports Massage and Stretching, remain direct choices and skip the ratio step. PT booking URLs retain the group as `training` and the selected variant as `serviceId`; old sample links such as `coach=ken` return to service selection. For Docker, also pass `--build-arg NEXT_PUBLIC_PT_CATEGORY_ID=1790`; `NEXT_PUBLIC_PT_BRANCH_ID` defaults to `14` and can also be passed as a build argument. Restart the development server or rebuild after changing the mapping. This catalog integration covers the PT service selector; the PT date/time step uses the reservation v4 availability and assignment checks described below; checkout uses the real reservation v4 flow described below.

PT prices come from each service's latest effective `ServicePrice` per active branch for the current Hong Kong date. The catalog exposes `priceCents` when those branch prices agree (the configured PT prices currently match across both branches). Missing, invalid or differing branch prices produce `null` for the initial cards; those services remain listed as HK$ TBC. The configured branch resolves its exact current service price, and proceeding from the time step requires a valid price and available slot. Group cards show the lowest configured price, and selecting a ratio uses that service's exact price in the ratio card, summary, payment review and confirmation. No sample PT price is used.

The PT **Pick a date and time** step validates the configured branch using `GET /public/catalog/branches?tenantId=3&categoryId=1790&serviceId=396`, followed by `GET /public/catalog/availability?tenantId=3&categoryId=1790&serviceId=396&branchId=14&date=2026-11-12`. The configured branch must satisfy reservation v4's active/reservable settings; another branch is never chosen automatically. The API calls the same `ReservationService.getReservationSlots` engine, scoped to the selected service, and returns only public slot data. Service frontend visibility/booking flags remain ignored for this explicitly selected category; ordinary reservation v4 calls retain their existing filters.

The UI offers 51 Hong Kong calendar dates and half-hour starts backed by the v4 15-minute availability engine. Branch hours, booking notice, last-start cutoff, service duration, therapist rosters, restrictions, occupied rooms and staff conflicts determine availability. One selected ratio product is one reservation item. Changing date/service clears the selected time; stale responses cannot replace the current selection. Continuing repeats the availability request with `time=HH:mm`, which also applies v4's service-to-room/staff assignment checks and buffers before entering contact details. Errors disable progression and provide retry. Reading or selecting a slot creates no reservation or hold.


PT payment submits `POST /reservation/v4?tenant=HKSH&locale=en` (or `zh-HK`), using the tenant public code supplied by the branches API. The request contains the selected service, branch, start time, current total in cents, customer name/email/phone/gender and accepted terms. The API independently validates the configured category, current branch price and room/coach assignment before creating the normal customer, redemption, service booking and unpaid invoice. Set `NEXT_PUBLIC_PT_CATEGORY_ID=1790` only in the website `.env.local`; the website sends it as `personalTrainingCategoryId`. The API validates that category against the tenant and verifies that the selected service belongs to it. No new database columns are required.

The website redirects to the KPay checkout URL returned by v4. A session-stored checkout token and invoice payment metadata make double clicks, lost responses and reloads reuse the same order. Returning to a pending payment resumes checkout rather than rejecting the slot occupied by that reservation. Changed prices or exhausted capacity return the customer to time selection. A failed gateway creation releases the reservation; no browser action marks a positive-price reservation paid.

KPay returns through the existing API reservation callback. Only a provider-verified paid order with the matching order ID, HKD currency and invoice amount settles the invoice/items. Successful KPay checks remove the temporary SportingHub checkout payment row. Receipt-access and retry metadata remain nested inside the real paid gateway entry, so refreshes and retries still resolve the same reservation. The callback redirects to the website URL supplied with that booking. The website reads the token-authorized payment status from the API before displaying the real booking reference, service, price and calendar links. Pending, failed or expired payments never display a success receipt. Set the branch's KPay merchant ID and signing key, API `KPAY_API_URL`, `DASHBOARD_API_URL`, and `DASHBOARD_URL` before real checkout. A genuinely zero-price service goes straight to the existing confirmation page without a gateway order. Payment failure/pending responses remain unconfirmed.


Set the return page in the **website** `.env.local` (no API redirect environment setting is needed):

```env
NEXT_PUBLIC_KPAY_REDIRECT_URL="http://localhost:3001/{locale}/booking/confirmation/"
```

`{locale}` becomes `en` or `zh-HK`. Use the public HTTPS website URL in production, including any deployment prefix, for example `https://example.com/hub/{locale}/booking/confirmation/`. Leave it empty to use the current website origin and localized confirmation route. Restart the website development server or rebuild after changing it. For Docker, pass the same value through `--build-arg NEXT_PUBLIC_KPAY_REDIRECT_URL=...`.

The website sends the resolved URL as `redirectUrl` in the v4 reservation body. The API validates it and stores it in the existing invoice payment metadata; the KPay callback uses that stored destination and appends only `mode=pt` and `reservationCode`. The callback also accepts an optional URL-encoded `redirect` query parameter, which takes precedence over the stored destination. V4 includes the website return URL in this parameter when creating the KPay order. The override must be an absolute HTTPS URL, or HTTP on localhost for development. Bookings without an override keep the existing dashboard return. New free bookings also use the configured website return.

The website verifies `GET /reservation/v4/checkout-status?tenantId=3&code=...` using its saved checkout token in the Authorization header. Customer contact details and the bearer are not included in the return URL or public status response. The customer must return in the browser session that created the booking; missing sessions show a recovery message without exposing the reservation. Reloads and language changes repeat authoritative status verification without public availability checks or another reservation submission.

Venue KPay returns to the configured website page with `mode=venue`, the invoice-based `checkoutId`, and the private checkout bearer in the URL fragment. The browser removes the fragment immediately, restores the session and verifies payment through the existing checkout status API. Pending or failed returns never render a success receipt. No extra checkout tables or invoice columns were added.

No new invoice creates an “Online booking — pay at venue” method. A hold stores only private booking metadata, which is excluded from invoice payment-method displays. Once paid, that metadata stays nested in the real gateway payment entry. Legacy entries remain readable for token compatibility, but their status flags cannot confirm an unpaid balance. Class/course payments now use KPay as well; truly free bookings are already settled at zero and need no gateway order.
