"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { extractApiError } from "@/lib/extractApiError";

export default function PricingPage() {
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
            setCheckoutError(extractApiError(err) || "Could not start checkout.");
        } finally {
            setCheckoutLoading(false);
        }
    }, [user, router]);

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

                        <motion.h2 variants={itemVariants} className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white mb-6">
                            Simple, transparent pricing
                        </motion.h2>
                        <motion.p variants={itemVariants} className="text-slate-600 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                            Choose the plan that fits your knowledge needs. No hidden fees. Start for free and upgrade when you need to power up.
                        </motion.p>
                        {canceledNotice ? (
                            <motion.p
                                variants={itemVariants}
                                className="mt-6 mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                                role="status"
                            >
                                Checkout was canceled. You can try again whenever you are ready.
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
                                <h4 className="text-lg font-bold text-slate-500 mb-2 uppercase tracking-widest">Free</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-slate-900 dark:text-white">฿0</span>
                                    <span className="text-slate-500 font-medium">/month</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Perfect for exploring the platform and testing our core AI features.</p>
                            </div>
                            <ul className="space-y-5 mb-10 flex-grow text-sm md:text-base">
                                {[
                                    { text: "Up to 5 documents", active: true },
                                    { text: "AI Summary (Limited)", active: true },
                                    { text: "10 AI Queries per day", active: true },
                                    { text: "3 Quizzes per document", active: true },
                                    { text: "Knowledge Graph (Basic)", active: true },
                                    { text: "File Uploads (PDF/DOCX)", active: false },
                                ].map((feature, i) => (
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
                                    Get Started for Free
                                </Link>
                            ) : user.plan === "free" ? (
                                <div className="w-full py-4 px-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-center text-sm">
                                    Current plan
                                </div>
                            ) : (
                                <div className="w-full py-4 px-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-center text-sm">
                                    Free forever (base tier)
                                </div>
                            )}
                        </motion.div>

                        {/* Pro Plan */}
                        <motion.div variants={itemVariants} className="p-8 lg:p-10 rounded-3xl border-2 border-primary bg-white dark:bg-slate-900 flex flex-col relative shadow-2xl shadow-primary/20 hover:-translate-y-1 transition-transform">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                                Most Popular
                            </div>
                            <div className="mb-8">
                                <h4 className="text-lg font-bold text-primary mb-2 uppercase tracking-widest">Pro</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-slate-900 dark:text-white">฿299</span>
                                    <span className="text-slate-500 font-medium">/month</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">For students, researchers, and pros who need unlimited potential.</p>
                            </div>
                            <ul className="space-y-5 mb-10 flex-grow text-sm md:text-base">
                                {[
                                    { text: "Unlimited documents", active: true },
                                    { text: "100 AI Queries per day", active: true },
                                    { text: "Unlimited Quizzes", active: true },
                                    { text: "Unlimited Flashcards", active: true },
                                    { text: "Advanced Knowledge Graph", active: true },
                                    { text: "File Uploads up to 10MB", active: true },
                                ].map((feature, i) => (
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
                                <div className="w-full py-4 px-6 rounded-xl bg-primary/10 text-primary font-bold text-center text-sm">
                                    Your current plan
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleUpgrade}
                                    disabled={checkoutLoading}
                                    className="w-full py-4 px-6 rounded-xl bg-primary text-white font-bold text-center shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {checkoutLoading ? "Redirecting…" : "Upgrade to Pro"}
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
                        <h4 className="font-bold text-xl mb-3 text-slate-900 dark:text-white">Secure Payments via Stripe</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">You can cancel your subscription at any time. No hidden fees or long-term contracts.</p>
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
                    <p>© 2026 AI Knowledge Base Inc. All rights reserved.</p>
                </div>
            </footer>
        </>
    );
}
