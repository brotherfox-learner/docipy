import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, Outfit, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth-context";
import { SessionGate } from "@/components/SessionGate";
import { ThemeClassSync } from "@/components/ThemeClassSync";
import { isLocale, type Locale } from "@/i18n/config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: safeLocale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const themeInitScript = `
(function(){try{
var t=localStorage.getItem('theme');
var dark=t==='dark'||(t!=='light'&&(!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',dark);
}catch(e){}})();
`;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${outfit.variable} min-h-screen flex flex-col`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ThemeClassSync />
            <AuthProvider>
              <SessionGate>{children}</SessionGate>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
