import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function InsightsPage() {
  redirect({ href: "/dashboard", locale: await getLocale() });
}
