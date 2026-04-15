"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { extractApiError } from "@/lib/extractApiError";

type PricingFeature = { text: string; active: boolean };

export default function PricingPage() {
    const t = useTranslations("pricing");
    const freeFeatures = t.raw("freeFeatures") as PricingFeature[];
    const proFeatures = t.raw("proFeatures") as PricingFeature[];
    const { user } = useAuth();
    const router = useRouter();
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [canceledNotice, setCanceledNotice] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("canceled") === "true") {
            setCanceledNotice(true);
            const url = new URL(window.location.href);
            url.searchParams.delete("canceled");
            window.history.replaceState({}, "", url.pathname + url.search);
        }
    }, []);

    const handleUpgrade = useCallback(async () => {
        setCheckoutError(null);
        if (!user) {
            router.push("/login");
            return;
        }
        setCheckoutLoading(true);
        try {
            const { data } = await api.post<{ data: { url: string } }>("/api/payment/checkout");
            window.location.href = data.data.url;
        } catch (err) {
            setCheckoutError(extractApiError(err) || t("checkoutError"));
        } finally {
            setCheckoutLoading(false);
        }
    }, [user, router, t]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-20 lg:pb-32 min-h-screen bg-background-light dark:bg-background-dark/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="text-center mb-16 relative"
                    >
                        {/* Background elements */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen -z-10 animate-pulse"></div>

                        <motion.h2 variants={itemVariants} className="mb-6 text-4xl font-black text-slate-900 dark:text-white lg:text-6xl">
                            {t("title")}
                        </motion.h2>
                        <motion.p variants={itemVariants} className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400 md:text-xl">
                            {t("subtitle")}
                        </motion.p>
                        {canceledNotice ? (
                            <motion.p
                                variants={itemVariants}
                                className="mx-auto mt-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                                role="status"
                            >
                                {t("canceledNotice")}
                            </motion.p>
                        ) : null}
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
                    >
                        {/* Free Plan */}
                        <motion.div variants={itemVariants} className="p-8 lg:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform">
                            <div className="mb-8">
                                <h4 className="mb-2 text-lg font-bold uppercase tracking-widest text-slate-500">{t("freeTitle")}</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-slate-900 dark:text-white">฿0</span>
                                    <span className="font-medium text-slate-500">{t("perMonth")}</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("freeDesc")}</p>
                            </div>
                            <ul className="mb-10 flex-grow space-y-5 text-sm md:text-base">
                                {freeFeatures.map((feature, i) => (
                                    <li key={i} className={`flex items-start gap-4 ${feature.active ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}>
                                        <span className={`material-symbols-outlined text-lg mt-0.5 ${feature.active ? 'text-green-500' : 'text-slate-300 dark:text-slate-700'}`}>
                                            {feature.active ? 'check_circle' : 'cancel'}
                                        </span>
                                        {feature.text}
                                    </li>
                                ))}
                            </ul>
                            {!user ? (
                                <Link
                                    href="/register"
                                    className="w-full py-4 px-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors block"
                                >
                                    {t("getStartedFree")}
                                </Link>
                            ) : user.plan === "free" ? (
                                <div className="w-full rounded-xl border-2 border-slate-200 px-6 py-4 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    {t("currentPlan")}
                                </div>
                            ) : (
                                <div className="w-full rounded-xl border-2 border-slate-200 px-6 py-4 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    {t("freeForever")}
                                </div>
                            )}
                        </motion.div>

                        {/* Pro Plan */}
                        <motion.div variants={itemVariants} className="p-8 lg:p-10 rounded-3xl border-2 border-primary bg-white dark:bg-slate-900 flex flex-col relative shadow-2xl shadow-primary/20 hover:-translate-y-1 transition-transform">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-blue-500 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg">
                                {t("mostPopular")}
                            </div>
                            <div className="mb-8">
                                <h4 className="mb-2 text-lg font-bold uppercase tracking-widest text-primary">{t("proTitle")}</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-slate-900 dark:text-white">฿299</span>
                                    <span className="font-medium text-slate-500">{t("perMonth")}</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("proDesc")}</p>
                            </div>
                            <ul className="mb-10 flex-grow space-y-5 text-sm md:text-base">
                                {proFeatures.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-4 text-slate-700 dark:text-slate-300 font-medium">
                                        <span className="material-symbols-outlined text-lg mt-0.5 text-primary">check_circle</span>
                                        {feature.text}
                                    </li>
                                ))}
                            </ul>
                            {checkoutError ? (
                                <p className="mb-3 text-center text-sm text-red-600 dark:text-red-400" role="alert">
                                    {checkoutError}
                                </p>
                            ) : null}
                            {user?.plan === "pro" ? (
                                <div className="w-full rounded-xl bg-primary/10 px-6 py-4 text-center text-sm font-bold text-primary">
                                    {t("yourCurrentPlan")}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleUpgrade}
                                    disabled={checkoutLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-center font-bold text-white shadow-xl shadow-primary/30 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                                >
                                    {checkoutLoading ? t("redirecting") : t("upgradeToPro")}
                                    <span className="material-symbols-outlined text-sm" aria-hidden>
                                        rocket_launch
                                    </span>
                                </button>
                            )}
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-20 max-w-3xl mx-auto text-center bg-blue-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-blue-100 dark:border-slate-700/50"
                    >
                        <h4 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{t("stripeTitle")}</h4>
                        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t("stripeBody")}</p>
                        <div className="flex items-center justify-center gap-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
                            {/* Mock logos for payment methods */}
                            <span className="material-symbols-outlined text-3xl">credit_card</span>
                            <span className="material-symbols-outlined text-3xl">payments</span>
                            <span className="material-symbols-outlined text-3xl">account_balance</span>
                        </div>
                    </motion.div>

                </div>
            </main>

            <footer className="bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
                    <p>{t("footer")}</p>
                </div>
            </footer>
        </>
    );
}
