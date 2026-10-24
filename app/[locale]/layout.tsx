import type { Viewport } from "next";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getSiteMessages } from "@/i18n/translate";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html
      lang={locale}
      data-view="client"
      data-booking="open"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Figtree:wght@400;500;600&family=Barlow+Condensed:wght@600;700&family=EB+Garamond:wght@400;500&family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider
          locale={locale}
          messages={getSiteMessages(locale)}
          timeZone="Asia/Hong_Kong"
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
