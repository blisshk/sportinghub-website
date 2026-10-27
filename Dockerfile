# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /app
ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=sportinghub-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false --store-dir=/pnpm/store

COPY . .

ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_SITE_URL="https://whhoaf.github.io/hksh-prototype/"
ARG NEXT_PUBLIC_BOOKING_API_URL=""
ARG NEXT_PUBLIC_BOOKING_TENANT_ID="3"
ARG NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID=""
ARG NEXT_PUBLIC_VENUE_VB_B_SERVICE_ID=""
ARG NEXT_PUBLIC_VENUE_BB_SERVICE_ID=""
ARG NEXT_PUBLIC_VENUE_PB_SERVICE_ID=""
ARG NEXT_PUBLIC_VENUE_BD_SERVICE_ID=""
ARG NEXT_PUBLIC_VENUE_FB_A_SERVICE_ID=""
ARG NEXT_PUBLIC_VENUE_FB_B_SERVICE_ID=""
ARG NEXT_PUBLIC_VENUE_DB_SERVICE_ID=""
ARG NEXT_PUBLIC_VENUE_TQ_SERVICE_ID=""
ENV NODE_ENV=production \
    NEXT_OUTPUT=standalone \
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH} \
    NEXT_PUBLIC_BOOKING_API_URL=${NEXT_PUBLIC_BOOKING_API_URL} \
    NEXT_PUBLIC_BOOKING_TENANT_ID=${NEXT_PUBLIC_BOOKING_TENANT_ID} \
    NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID=${NEXT_PUBLIC_VENUE_VB_A_SERVICE_ID} \
    NEXT_PUBLIC_VENUE_VB_B_SERVICE_ID=${NEXT_PUBLIC_VENUE_VB_B_SERVICE_ID} \
    NEXT_PUBLIC_VENUE_BB_SERVICE_ID=${NEXT_PUBLIC_VENUE_BB_SERVICE_ID} \
    NEXT_PUBLIC_VENUE_PB_SERVICE_ID=${NEXT_PUBLIC_VENUE_PB_SERVICE_ID} \
    NEXT_PUBLIC_VENUE_BD_SERVICE_ID=${NEXT_PUBLIC_VENUE_BD_SERVICE_ID} \
    NEXT_PUBLIC_VENUE_FB_A_SERVICE_ID=${NEXT_PUBLIC_VENUE_FB_A_SERVICE_ID} \
    NEXT_PUBLIC_VENUE_FB_B_SERVICE_ID=${NEXT_PUBLIC_VENUE_FB_B_SERVICE_ID} \
    NEXT_PUBLIC_VENUE_DB_SERVICE_ID=${NEXT_PUBLIC_VENUE_DB_SERVICE_ID} \
    NEXT_PUBLIC_VENUE_TQ_SERVICE_ID=${NEXT_PUBLIC_VENUE_TQ_SERVICE_ID} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# The package's postbuild hook creates aliases in out/ for static exports only.
RUN pnpm exec next build --webpack

FROM node:24-alpine AS production

WORKDIR /app
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080 \
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e 'fetch(`http://127.0.0.1:${process.env.PORT}${(process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "")}/en/`, { method: "HEAD", signal: AbortSignal.timeout(2000) }).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))'

CMD ["node", "server.js"]
