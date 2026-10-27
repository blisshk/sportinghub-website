import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const standalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  output: standalone ? "standalone" : "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  // Static exports create these files in postbuild; the Node server uses rewrites.
  ...(standalone && {
    async rewrites() {
      return ["", "/en", "/zh-HK"].flatMap((prefix) =>
        ["booking", "coming-soon", "terms"].map((route) => ({
          source: `${prefix}/${route}.html`,
          destination: `${prefix}/${route}/`,
        })),
      );
    },
  }),
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
