import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TermsPage } from "@/components/terms-page";
import { isLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return pageMetadata(locale, "terms", "/terms/");
}
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <TermsPage locale={locale} />;
}
