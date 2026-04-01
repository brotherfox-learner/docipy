"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
    const { user } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-2 group">
                        <motion.div
                            whileHover={{ rotate: 15 }}
                            className="bg-primary text-white p-1.5 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                        </motion.div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                            Docipy 
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <Link className="text-sm font-medium hover:text-primary transition-colors" href="/#features">Features</Link>
                        <Link className="text-sm font-medium hover:text-primary transition-colors" href="/#how-it-works">How it Works</Link>
                        <Link className="text-sm font-medium hover:text-primary transition-colors" href="/pricing">Pricing</Link>
                        <Link className="text-sm font-medium hover:text-primary transition-colors" href="/dashboard">Dashboard</Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {user ? (
                            <UserMenu variant="navbar" />
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="hidden sm:block text-sm font-semibold px-4 py-2 text-slate-700 dark:text-slate-200 hover:text-primary transition-colors"
                                >
                                    Login
                                </Link>
                                <Link href="/register">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-primary hover:bg-primary/90 text-white text-sm font-bold px-5 py-2 rounded-lg transition-all shadow-lg shadow-primary/20"
                                    >
                                        Start Free
                                    </motion.button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
