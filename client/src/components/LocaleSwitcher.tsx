"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { locales, type Locale } from "@/i18n/config";

export function LocaleSwitcher({
  className = "",
  /** Extra inset when placed inside the user menu dropdown */
  menuItem = false,
  variant = "toolbar",
}: {
  className?: string;
  menuItem?: boolean;
  variant?: "toolbar" | "menu";
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("localeSwitcher");

  const isMenu = variant === "menu" && menuItem;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale;
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  const selectClassName = `locale-select ${isMenu ? "locale-select--in-menu" : ""} ${className}`.trim();

  const select = (
    <select
      value={locale}
      onChange={onChange}
      aria-label={t("switchLanguage")}
      className={selectClassName}
    >
      {locales.map((code) => (
        <option key={code} value={code}>
          {code === "en" ? t("optionEnglish") : t("optionThai")}
        </option>
      ))}
    </select>
  );

  if (isMenu) {
    return <div className="px-2 py-1.5">{select}</div>;
  }

  return <div className={`min-w-0 ${className}`.trim()}>{select}</div>;
}
