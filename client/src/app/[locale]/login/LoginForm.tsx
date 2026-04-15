"use client";

import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { extractApiError } from "@/lib/extractApiError";

function safeReturnPath(from: string | null): string {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return "/dashboard";
  if (from.startsWith("/login") || from.startsWith("/register")) return "/dashboard";
  return from;
}

export default function LoginForm() {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push(safeReturnPath(searchParams.get("from")));
      router.refresh();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || t("login.loginFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleOAuth(provider: "google" | "github") {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/oauth/${provider}`;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <div className="flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 lg:px-40 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 15 }}
              className="flex items-center justify-center size-10 rounded-lg bg-primary text-white shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined">psychology</span>
            </motion.div>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight group-hover:text-primary transition-colors">
              Docipy
            </h2>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              href="#"
            >
              {t("documentation")}
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 border border-slate-200 dark:border-slate-800"
          >
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <div className="mb-8">
                <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {t("login.welcomeBack")}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">{t("login.subtitle")}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
                >
                  <img alt="Google" src="/oauth/google.svg" className="size-5 shrink-0" width={20} height={20} />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
                >
                  <img alt="GitHub" src="/oauth/github.svg" className="size-5 shrink-0" width={20} height={20} />
                  <span>GitHub</span>
                </button>
              </div>

              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">{t("login.orEmail")}</span>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg text-sm font-medium">
                  ⚠️ {error}
                </div>
              )}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("login.emailLabel")}</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                    placeholder={t("login.emailPlaceholder")}
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("login.passwordLabel")}</label>
                    <Link className="text-xs font-medium text-primary hover:underline" href="#">
                      {t("login.forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full h-12 pl-4 pr-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      aria-pressed={showPassword}
                      aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="material-symbols-outlined text-xl" aria-hidden>
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  disabled={isLoading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-all shadow-lg shadow-primary/20 mt-4 disabled:opacity-70 flex justify-center items-center"
                  type="submit"
                >
                  {isLoading ? t("login.signingIn") : t("login.signIn")}
                </motion.button>
              </form>
              <p className="mt-8 text-center text-sm text-slate-500">
                {t("login.noAccount")}{" "}
                <Link className="font-bold text-primary hover:underline" href="/register">
                  {t("login.createAccount")}
                </Link>
              </p>
            </div>

            <div className="hidden lg:flex flex-col justify-between p-12 bg-primary relative overflow-hidden text-white">
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-10 transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl opacity-30 transform -translate-x-1/2 translate-y-1/2" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                  <span className="size-2 bg-green-400 rounded-full animate-pulse" />
                  {t("login.sideBadge")}
                </div>
                <h2 className="mb-6 text-4xl font-black leading-tight">{t("login.sideTitle")}</h2>
                <p className="max-w-sm text-lg leading-relaxed text-white/80">{t("login.sideBody")}</p>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="relative z-10 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t("login.demoCardTitle")}</p>
                    <p className="text-xs text-white/60">{t("login.demoCardTime")}</p>
                  </div>
                </div>
                <p className="text-sm italic leading-relaxed text-white/90">&quot;{t("login.demoQuote")}&quot;</p>
              </motion.div>
            </div>
          </motion.div>
        </main>

        <footer className="px-6 lg:px-40 py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
          <p>
            {t("login.footerCopyright")}
            <span className="mx-2">•</span>
            <Link className="transition-colors hover:text-primary" href="#">
              {t("login.privacy")}
            </Link>
            <span className="mx-2">•</span>
            <Link className="transition-colors hover:text-primary" href="#">
              {t("login.terms")}
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
