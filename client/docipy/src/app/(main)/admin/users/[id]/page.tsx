"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "@/components/UserMenu";
import { extractApiError } from "@/lib/extractApiError";

interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  oauth_provider: string | null;
  ai_queries_today: number;
  flashcards_generated: number;
  quiz_generated: number;
  documents_count: number;
  usage_reset_at: string | null;
  last_active_at: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
}

interface DetailStats {
  ai_queries_total: number;
  documents_active: number;
  total_word_count: number;
  flashcards_total: number;
  quizzes_total: number;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { isLoadingSession } = useAuth();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [stats, setStats] = useState<DetailStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [banning, setBanning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/users/${id}`);
      setUser(res.data.data.user);
      setStats(res.data.data.stats);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(extractApiError(err) || "Could not load user.");
      setUser(null);
      setStats(null);
      if (status === 403 || status === 401) {
        router.replace("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isLoadingSession) return;
    void load();
  }, [load, isLoadingSession]);

  async function toggleBan() {
    if (!user) return;
    setActionError(null);
    setBanning(true);
    try {
      await api.patch(`/api/admin/users/${user.id}/ban`, { is_active: !user.is_active });
      setUser((u) => (u ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      setActionError(extractApiError(err) || "Could not update user.");
    } finally {
      setBanning(false);
    }
  }

  const displayName = user?.name?.trim() || user?.email || "User";

  if (isLoadingSession || (loading && !error)) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-8" aria-busy="true">
        <p className="text-slate-500 dark:text-slate-400">Loading user…</p>
      </section>
    );
  }

  if (error || !user || !stats) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-700 dark:text-red-300 mb-4">{error || "User not found."}</p>
        <Link href="/admin" className="text-primary font-semibold hover:underline">
          ← Back to admin
        </Link>
      </section>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8">
      <header className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/admin" className="text-primary font-semibold hover:underline">
              Admin
            </Link>
            <span aria-hidden> / </span>
            User
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{displayName}</h1>
        </div>
        <UserMenu variant="header" />
      </header>

      {actionError ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
          {actionError}
        </p>
      ) : null}

      <section
        aria-label="User profile"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm mb-8"
      >
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={`${displayName} profile photo`}
              width={120}
              height={120}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-3xl font-black text-slate-600 dark:text-slate-300 shrink-0"
              aria-hidden
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-slate-600 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400 text-sm block">Email</span>
              {user.email}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400 text-sm block">Account status</span>
              <span
                className={
                  user.is_active
                    ? "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-700 dark:text-red-400"
                }
              >
                {user.is_active ? "Active" : "Banned"}
              </span>
              {user.is_verified ? (
                <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400">
                  Verified
                </span>
              ) : null}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400 text-sm block">Plan</span>
              <span className="font-semibold capitalize">{user.plan}</span>
              {user.subscription_status ? (
                <span className="text-slate-500 dark:text-slate-400 text-sm ml-2">
                  Subscription: {user.subscription_status}
                </span>
              ) : null}
            </p>
            {user.oauth_provider ? (
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                OAuth: <span className="font-medium">{user.oauth_provider}</span>
              </p>
            ) : null}
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              <span className="text-slate-500 dark:text-slate-400 block">Joined</span>
              {new Date(user.created_at).toLocaleString()}
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              <span className="text-slate-500 dark:text-slate-400 block">Profile updated</span>
              {new Date(user.updated_at).toLocaleString()}
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              <span className="text-slate-500 dark:text-slate-400 block">Last session (refresh token issued)</span>
              {user.last_active_at ? new Date(user.last_active_at).toLocaleString() : "No active session"}
            </p>
            {user.current_period_end ? (
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                <span className="text-slate-500 dark:text-slate-400 block">Billing period ends</span>
                {new Date(user.current_period_end).toLocaleString()}
              </p>
            ) : null}
            {user.stripe_customer_id ? (
              <p className="text-slate-600 dark:text-slate-300 text-sm font-mono break-all">
                <span className="text-slate-500 dark:text-slate-400 block font-sans">Stripe customer</span>
                {user.stripe_customer_id}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={banning}
            onClick={() => void toggleBan()}
            className={
              user.is_active
                ? "text-sm px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
                : "text-sm px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50"
            }
          >
            {banning ? "…" : user.is_active ? "Ban user" : "Unban user"}
          </button>
        </div>
      </section>

      <section aria-label="Usage and activity statistics">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Usage &amp; content</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "AI queries (total)", value: stats.ai_queries_total },
            { label: "AI queries today", value: user.ai_queries_today },
            { label: "Documents (active)", value: stats.documents_active },
            { label: "Documents (counter)", value: user.documents_count },
            { label: "Total words in docs", value: stats.total_word_count },
            { label: "Flashcards (total)", value: stats.flashcards_total },
            { label: "Flashcards generated (counter)", value: user.flashcards_generated },
            { label: "Quizzes (total)", value: stats.quizzes_total },
            { label: "Quizzes generated (counter)", value: user.quiz_generated },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
            >
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</h3>
              <p className="text-2xl font-black tabular-nums mt-1">{Number(item.value).toLocaleString()}</p>
            </article>
          ))}
        </div>
        {user.usage_reset_at ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Daily usage counters reset reference: {new Date(user.usage_reset_at).toLocaleString()}
          </p>
        ) : null}
      </section>
    </motion.div>
  );
}
