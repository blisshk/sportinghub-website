import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "./config";

export async function pageMetadata(
  locale: Locale,
  page: "home" | "booking" | "comingSoon" | "terms",
  path: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale });
  const title = t(`meta.${page}.title`);
  const description = t(`meta.${page}.description`);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://whhoaf.github.io/hksh-prototype/";
  const publicBase = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const languages = Object.fromEntries(
    locales.map((value) => [
      value,
      new URL(`${value}${path}`, publicBase).href,
    ]),
  );
  const canonical = languages[locale];
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical,
      languages: { ...languages, "x-default": languages.en },
    },
    openGraph: {
      type: "website",
      siteName: t("brand.name"),
      title,
      description,
      url: canonical,
      locale: locale === "zh-HK" ? "zh_HK" : "en_HK",
      alternateLocale: locale === "zh-HK" ? "en_HK" : "zh_HK",
      images: [
        {
          url: new URL("assets/og/og-image.jpg", publicBase).href,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
