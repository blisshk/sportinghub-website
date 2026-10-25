import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BookingPage } from "@/components/booking-page";
import { isLocale } from "@/i18n/config";

export default async function BookingLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <BookingPage locale={locale} />
      {children}
    </>
  );
}
