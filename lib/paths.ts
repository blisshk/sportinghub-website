import { isLocale, type Locale } from "@/i18n/config";

/** Asset paths do not include a locale segment. */
export function withBasePath(path: string): string {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

export function localizedPath(path: string, locale: Locale): string {
  return withBasePath(`/${locale}${path.startsWith("/") ? path : `/${path}`}`);
}

export function switchLocalePath(pathname: string, locale: Locale): string {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const path =
    basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const segments = path.split("/");
  if (isLocale(segments[1])) segments.splice(1, 1);
  return localizedPath(segments.join("/") || "/", locale);
}

/** Refresh when a hash changes, and immediately before following a language link. */
export function syncLocaleLinks(
  root: ParentNode = document,
  location: Pick<Location, "pathname" | "search" | "hash"> = window.location,
) {
  root.querySelectorAll<HTMLAnchorElement>("a[data-locale]").forEach((link) => {
    const locale = link.dataset.locale;
    if (isLocale(locale)) {
      link.href = `${switchLocalePath(location.pathname, locale)}${location.search}${location.hash}`;
    }
  });
}
