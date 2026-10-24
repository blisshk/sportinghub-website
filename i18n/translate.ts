import { createTranslator } from "next-intl";
import english from "@/messages/en.json";
import chinese from "@/messages/zh-HK.json";
import type { Locale } from "./config";

export function getSiteMessages(locale: Locale) {
  return locale === "zh-HK" ? chinese : english;
}

/** Preserve existing content identifiers while using nested next-intl messages. */
export function messageKey(key: string) {
  return ["pillar.venue", "pillar.class", "pillar.pt"].includes(key)
    ? `${key}.label`
    : key;
}

export function createSiteTranslator(
  locale: Locale,
  messages: typeof english = getSiteMessages(locale),
) {
  const intl = createTranslator({
    locale,
    messages,
    timeZone: "Asia/Hong_Kong",
  });
  type MessageKey = Parameters<typeof intl>[0];
  const translate = (key: string, values?: Record<string, string | number>) =>
    intl(messageKey(key) as MessageKey, values);
  translate.raw = (key: string): string =>
    intl.raw(messageKey(key) as MessageKey);
  return translate;
}
