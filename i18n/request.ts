import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { getSiteMessages } from "./translate";

export default getRequestConfig(async ({ locale: requestedLocale }) => {
  const locale = requestedLocale ?? (await rootParams.locale());
  if (!hasLocale(routing.locales, locale)) notFound();
  return {
    locale,
    messages: getSiteMessages(locale),
    timeZone: "Asia/Hong_Kong",
  };
});
