# Sporting Hub Hong Kong

Next.js App Router site using React, TypeScript and Tailwind CSS v4. The existing venue design, English/Traditional Chinese content and booking demonstration are preserved.

## Development

Requires Node.js 22.13 or later and pnpm 11.20.0 (pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

Open http://localhost:3001/en/ for English or http://localhost:3001/zh-HK/ for Hong Kong Chinese. Each locale includes the home, `coming-soon/`, `booking/` and `terms/` pages. Booking accepts the existing `mode=venue|class|pt`, `court` and `t` query parameters. `?view=dev` enables the original review annotations.

Translations use `next-intl` with catalogs in `messages/en.json` and `messages/zh-HK.json`. Locale prefixes are required, and the URL determines the language on the server and in the browser. The language links retain the current page, query parameters and section anchor. Unprefixed and original `.html` URLs redirect to English while retaining query parameters and anchors. Both locales are statically generated; locale detection middleware is not needed by the Nginx runtime.

Development and production scripts use Next.js's Webpack compiler for compatibility with restricted development environments.

## Validation and production

```sh
pnpm typecheck
pnpm build
pnpm test:smoke
pnpm preview
```

The build exports the complete site to `out/`, including both locales, assets, `.nojekyll` and compatibility files for `booking.html`, `coming-soon.html` and `terms.html` at the root and under each locale. Deploy the contents of `out/` to a static host such as GitHub Pages. Set GitHub Pages to deploy a build artifact rather than the source checkout. `pnpm preview` serves the exported site locally on port 3001; set `PORT` to change its port. `next start` is not used with static exports.

For a repository subpath, set `NEXT_PUBLIC_BASE_PATH` before building, for example `/sportinghub-website`. Set `NEXT_PUBLIC_SITE_URL` to the full public URL (including that subpath) for canonical and social metadata. See `.env.example`. Use the same base path when running the preview. These values are embedded at build time.

## Production Docker image

```sh
docker build -t sportinghub-website:prod .
docker run --rm -p 8080:8080 sportinghub-website:prod
```

Open http://localhost:8080. The multi-stage image builds with pnpm and serves the static export through Nginx as an unprivileged user. It includes a `/healthz` health check, real 404 responses and immutable caching for hashed Next.js assets.

Pass the public URL and optional subpath when building for your production host:

```sh
docker build -t sportinghub-website:prod \
  --build-arg NEXT_PUBLIC_SITE_URL=https://sports.example.com/sportinghub/ \
  --build-arg NEXT_PUBLIC_BASE_PATH=/sportinghub .
```

The locale pages are then served at `/sportinghub/en/` and `/sportinghub/zh-HK/`. Local `.env` files are excluded from the Docker build context; use these build arguments. Rebuild the image to change either value, since runtime environment variables cannot change the exported pages. Terminate HTTPS at your reverse proxy or load balancer.

## Source layout

- `app/`: routes, metadata, document layout and Tailwind entrypoint.
- `components/`: React page content, shared SVG illustrations and browser lifecycle component. The home and coming-soon routes share `HomePage`.
- `i18n/` and `messages/`: next-intl configuration, locale routing, metadata and English/Hong Kong Chinese catalogs.
- `lib/data.js`: booking structure and availability sample data.
- `lib/site-runtime.js`: existing booking state machine and browser interactions, scoped to a component mount with cleanup.
- `styles/`: brand tokens and Tailwind component styles; custom selectors preserve the original illustrations, responsive layouts and UI states.
- `public/assets/`: original venue photos, logos and court diagrams.

The booking flow remains a frontend demonstration: availability, payment, booking references and door QR codes are samples. Connecting it to the Bliss API/payment service is a separate integration.
