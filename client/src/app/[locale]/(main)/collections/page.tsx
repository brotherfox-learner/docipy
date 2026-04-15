import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function CollectionsPage() {
  redirect({ href: "/documents", locale: await getLocale() });
}
