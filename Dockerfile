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
ENV NODE_ENV=production \
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

RUN pnpm build \
    && mkdir -p "/site${NEXT_PUBLIC_BASE_PATH}" \
    && cp -a out/. "/site${NEXT_PUBLIC_BASE_PATH}/" \
    && if [ -n "${NEXT_PUBLIC_BASE_PATH}" ]; then cp out/404.html /site/404.html; fi

FROM nginx/nginx-unprivileged:stable-alpine AS production

USER root
RUN rm -rf /usr/share/nginx/html/*
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/ /usr/share/nginx/html/
USER nginx

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
