import { localizedPath } from "@/lib/paths";
import { defaultLocale } from "@/i18n/config";

/** Static-host compatible redirect that keeps booking parameters and legal anchors. */
export function LocaleRedirect({ path }: { path: string }) {
  const target = localizedPath(path, defaultLocale);
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(target)} + window.location.search + window.location.hash);`,
        }}
      />
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${target}`} />
      </noscript>
      <p>
        <a href={target}>Continue to Sporting Hub Hong Kong</a>
      </p>
    </>
  );
}
