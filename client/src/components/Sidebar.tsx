"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";

import { useAuth } from "@/lib/auth-context";
import {
    FREE_AI_QUERIES_PER_DAY,
    FREE_DOCUMENT_CAP,
} from "@/lib/plan-limits";

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const docPct =
        user && user.plan === "free"
            ? Math.min(100, (user.documents_count / FREE_DOCUMENT_CAP) * 100)
            : null;
    const aiPct =
        user && user.plan === "free"
            ? Math.min(100, (user.ai_queries_today / FREE_AI_QUERIES_PER_DAY) * 100)
            : null;

    const planLabel = user
        ? `${user.plan.charAt(0).toUpperCase()}${user.plan.slice(1)} plan`
        : "Account";

    const docSegmentMatch = /^\/documents\/([^/]+)(?:\/|$)/.exec(pathname);
    const documentContextId =
        docSegmentMatch?.[1] && docSegmentMatch[1] !== "new" ? docSegmentMatch[1] : null;

    const documentToolLinks = documentContextId
        ? (
            [
                {
                    href: `/documents/${documentContextId}/learn`,
                    icon: "school",
                    label: "Learn",
                },
                {
                    href: `/documents/${documentContextId}/chat`,
                    icon: "forum",
                    label: "Chat",
                },
                {
                    href: `/documents/${documentContextId}/graph`,
                    icon: "account_tree",
                    label: "Graph",
                },
                {
                    href: `/documents/${documentContextId}/flashcards`,
                    icon: "view_carousel",
                    label: "Flashcards",
                },
                {
                    href: `/documents/${documentContextId}/quiz`,
                    icon: "fact_check",
                    label: "Quiz",
                },
            ] as const
        )
        : null;

    function isDocumentToolActive(href: string) {
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    const links = [
        { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
        { href: "/documents", icon: "description", label: "Documents" },
        { href: "/chat", icon: "chat", label: "Chat" },
        { href: "/flashcards", icon: "style", label: "Flashcards" },
        { href: "/quizzes", icon: "quiz", label: "Quizzes" },
        ...(user?.is_admin
            ? [{ href: "/admin", icon: "admin_panel_settings", label: "Admin dashboard" } as const]
            : []),
    ];

    return (
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col fixed h-full transition-colors z-40">
            <div className="p-6">
                <Link href="/" className="flex items-center gap-3 rounded-lg outline-offset-2 hover:opacity-90 transition-opacity">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined">auto_awesome</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">Docipy</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{planLabel}</p>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {links.map((link) => {
                    const isActive =
                        link.href === "/chat"
                            ? pathname === "/chat"
                            : pathname === link.href || pathname.startsWith(link.href + "/");
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative ${isActive
                                ? "text-primary"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 bg-primary/10 rounded-lg"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="material-symbols-outlined text-[20px] relative z-10">{link.icon}</span>
                            <span className="text-sm font-medium relative z-10">{link.label}</span>
                        </Link>
                    );
                })}

                {documentToolLinks ? (
                    <section
                        aria-label="Tools for the open document"
                        className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800"
                    >
                        <p className="px-1 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                            This document
                        </p>
                        <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-linear-to-b from-slate-50 to-slate-100/70 dark:from-slate-800/35 dark:to-slate-900/25 p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-0.5">
                            {documentToolLinks.map((item) => {
                                const active = isDocumentToolActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${active
                                            ? "bg-white text-primary shadow-sm ring-1 ring-primary/25 dark:bg-slate-950 dark:ring-primary/35"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/70"
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px] shrink-0 opacity-90" aria-hidden>
                                            {item.icon}
                                        </span>
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ) : null}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
                {user ? (
                    <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 mb-4 hover:shadow-md transition-shadow cursor-default space-y-3">
                        <p className="text-xs font-semibold text-primary">Plan usage</p>
                        {user.plan === "free" ? (
                            <>
                                <div>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                                        Documents {user.documents_count} / {FREE_DOCUMENT_CAP}
                                    </p>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${docPct ?? 0}%` }}
                                            transition={{ duration: 0.6, delay: 0.2 }}
                                            className="bg-primary h-full"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                                        AI today {user.ai_queries_today} / {FREE_AI_QUERIES_PER_DAY}
                                    </p>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${aiPct ?? 0}%` }}
                                            transition={{ duration: 0.6, delay: 0.35 }}
                                            className="bg-primary h-full"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                Pro plan — {user.documents_count} documents, {user.ai_queries_today} AI queries today.
                            </p>
                        )}
                    </div>
                ) : null}

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Link
                        href="/settings"
                        className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        <span className="text-sm font-medium">Settings</span>
                    </Link>
                </div>
            </div>
        </aside>
    );
}
