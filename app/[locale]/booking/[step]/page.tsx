import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BOOKING_STEPS } from "@/lib/booking-routes";
import { isLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";

type Props = { params: Promise<{ locale: string; step: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return BOOKING_STEPS.map((step) => ({ step }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, step } = await params;
  if (!isLocale(locale) || !BOOKING_STEPS.includes(step)) notFound();
  return pageMetadata(locale, "booking", `/booking/${step}/`);
}
export default async function Page({ params }: Props) {
  const { step } = await params;
  if (!BOOKING_STEPS.includes(step)) notFound();
  return null;
}
