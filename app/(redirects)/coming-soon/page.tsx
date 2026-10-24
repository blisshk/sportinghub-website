import { LocaleRedirect } from "@/components/locale-redirect";
import { pageMetadata } from "@/i18n/metadata";
export async function generateMetadata() {
  return pageMetadata("en", "comingSoon", "/coming-soon/");
}
export default function Page() {
  return <LocaleRedirect path="/coming-soon/" />;
}
