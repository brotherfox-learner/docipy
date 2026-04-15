"use client";

import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";

export default function RegisterPage() {
    const t = useTranslations("auth");
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    function handleOAuth(provider: "google" | "github") {
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/oauth/${provider}`;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            await api.post('/api/auth/register', form)
            setSuccess(t("register.successDefault"));
        } catch (err: unknown) {
            setError(extractApiError(err) || t("register.failed"));
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="relative flex min-h-screen items-center justify-center w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 p-4">
                <div className="text-center p-12 rounded-2xl border border-green-200 dark:border-green-900/40 bg-white dark:bg-slate-900 shadow-2xl max-w-md w-full">
                    <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl text-green-600">📬</span>
                    </div>
                    <h2 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                      {t("register.successTitle")}
                    </h2>
                    <p className="mb-8 leading-relaxed text-slate-500 dark:text-slate-400">{success}</p>
                    <Link
                      href="/login"
                      className="inline-block w-full rounded-lg bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                    >
                        {t("register.proceedSignIn")}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            <div className="flex h-full grow flex-col">
                {/* Navigation Header */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 lg:px-40 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
                    <Link href="/" className="flex items-center gap-3 group">
                        <motion.div whileHover={{ rotate: 15 }} className="flex items-center justify-center size-10 rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined">psychology</span>
                        </motion.div>
                        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight group-hover:text-primary transition-colors">Docipy</h2>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link className="text-sm font-medium text-slate-600 transition-colors hover:text-primary dark:text-slate-400" href="#">
                          {t("documentation")}
                        </Link>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl shadow-primary/5 border border-slate-200 dark:border-slate-800 flex-row-reverse"
                    >
                        {/* Left Side: Register Form */}
                        <div className="p-8 lg:p-12 flex flex-col justify-center lg:order-2">
                            <div className="mb-8">
                                <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                                  {t("register.title")}
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400">{t("register.subtitle")}</p>
                            </div>

                            {/* Social Auth */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button
                                    type="button"
                                    onClick={() => handleOAuth("google")}
                                    className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
                                >
                                    <img alt="Google" src="/oauth/google.svg" className="size-5 shrink-0" width={20} height={20} />
                                    Google
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleOAuth("github")}
                                    className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
                                >
                                    <img alt="GitHub" src="/oauth/github.svg" className="size-5 shrink-0" width={20} height={20} />
                                    GitHub
                                </button>
                            </div>

                            <div className="relative mb-8">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-700"></span></div>
                                <div className="relative flex justify-center text-xs uppercase">
                                  <span className="bg-white px-2 text-slate-500 dark:bg-slate-900">{t("register.orEmail")}</span>
                                </div>
                            </div>

                            {/* Form Fields */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg text-sm font-medium">
                                    ⚠️ {error}
                                </div>
                            )}
                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("register.nameLabel")}</label>
                                    <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder={t("register.namePlaceholder")} type="text" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("register.emailLabel")}</label>
                                    <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder={t("register.emailPlaceholder")} type="email" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("register.passwordLabel")}</label>
                                    <div className="relative">
                                        <input value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required minLength={8} autoComplete="new-password" className="w-full h-12 pl-4 pr-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="••••••••" type={showPassword ? "text" : "password"} />
                                        <button type="button" aria-pressed={showPassword} aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")} onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                            <span className="material-symbols-outlined text-xl" aria-hidden>{showPassword ? "visibility_off" : "visibility"}</span>
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
                                    {isLoading ? t("register.creating") : t("register.createAccount")}
                                </motion.button>
                            </form>
                            <p className="mt-8 text-center text-sm text-slate-500">
                                {t("register.hasAccount")}{" "}
                                <Link className="font-bold text-primary hover:underline" href="/login">
                                  {t("register.signInLink")}
                                </Link>
                            </p>
                        </div>

                        {/* Right Side: Decorative/Value Prop */}
                        <div className="hidden lg:flex flex-col justify-between p-12 bg-indigo-900 border-r border-slate-800/10 dark:border-slate-800 relative overflow-hidden text-white lg:order-1">
                            {/* Abstract Background Pattern */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                            <div className="absolute top-0 left-0 w-64 h-64 bg-primary rounded-full blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-20 transform translate-x-1/2 translate-y-1/2"></div>

                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                                    <span className="material-symbols-outlined text-sm text-yellow-400">workspace_premium</span>
                                    {t("register.sideBadge")}
                                </div>
                                <h2 className="mb-6 text-4xl font-black leading-tight">{t("register.sideTitle")}</h2>
                                <p className="max-w-sm text-lg leading-relaxed text-white/80">{t("register.sideBody")}</p>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                                className="relative z-10 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20"
                            >
                                <div className="flex gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map(i => <span key={i} className="material-symbols-outlined text-yellow-400 text-lg">star</span>)}
                                </div>
                                <p className="mb-4 text-sm italic leading-relaxed text-white/90">
                                    &quot;{t("register.testimonial")}&quot;
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-300" />
                                    <div>
                                        <h4 className="text-xs font-bold text-white">{t("register.testimonialAuthor")}</h4>
                                        <p className="text-[10px] text-white/60">{t("register.testimonialRole")}</p>
                                    </div>
                                </div>
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
