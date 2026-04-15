import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, type Locale } from "./config";
import { loadMessages } from "./loadMessages";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = requested && isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
