import { notFound } from "next/navigation";
import { LocaleRedirect } from "@/components/locale-redirect";
import { BOOKING_STEPS } from "@/lib/booking-routes";

export const dynamicParams = false;
export function generateStaticParams() {
  return BOOKING_STEPS.map((step) => ({ step }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  if (!BOOKING_STEPS.includes(step)) notFound();
  return <LocaleRedirect path={`/booking/${step}/`} />;
}
