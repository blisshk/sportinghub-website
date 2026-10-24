"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/config";
import { localizedPath, syncLocaleLinks } from "@/lib/paths";

type LanguageSwitcherProps = {
  locale: Locale;
  pathname: string;
  label: string;
};

/** Locale links work before hydration and retain the current query and hash. */
export function LanguageSwitcher({
  locale,
  pathname,
  label,
}: LanguageSwitcherProps) {
  const providerLocale = useLocale();
  const currentLocale =
    providerLocale === "en" || providerLocale === "zh-HK"
      ? providerLocale
      : locale;

  useEffect(() => {
    const sync = () => syncLocaleLinks();
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [pathname]);

  return (
    <div
      className="lang-toggle inline-flex items-center"
      role="group"
      aria-label={label}
    >
      {(["en", "zh-HK"] as const).map((targetLocale) => (
        <a
          key={targetLocale}
          data-locale={targetLocale}
          href={localizedPath(pathname, targetLocale)}
          hrefLang={targetLocale}
          lang={targetLocale}
          aria-label={targetLocale === "en" ? "English" : "繁體中文"}
          aria-current={currentLocale === targetLocale ? "page" : undefined}
          onClick={() => syncLocaleLinks()}
          onAuxClick={() => syncLocaleLinks()}
        >
          {targetLocale === "en" ? "EN" : "繁"}
        </a>
      ))}
    </div>
  );
}
