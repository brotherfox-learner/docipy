"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "@/components/UserMenu";
import { extractApiError } from "@/lib/extractApiError";

const PAGE_SIZE = 20;

interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: string;
  is_verified: boolean;
  is_active: boolean;
  documents_count: number;
  ai_queries_today: number;
  created_at: string;
  subscription_status?: string | null;
  last_active_at: string | null;
}

interface Stats {
  totalUsers: number;
  totalDocuments: number;
  proUsers: number;
  totalAIQueriesToday: number;
}

export default function AdminPage() {
  const { user, isLoadingSession } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

  const fetchData = useCallback(async () => {
    setListError(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get("/api/admin/users", {
          params: { search, limit: PAGE_SIZE, page },
        }),
        api.get("/api/admin/stats"),
      ]);
      setUsers(usersRes.data.data.users);
      setTotalUsers(usersRes.data.data.total ?? 0);
      setStats(statsRes.data.data);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      const msg = extractApiError(err) || "Could not load admin data.";
      setListError(msg);
      setUsers([]);
      setTotalUsers(0);
      setStats(null);
      if (status === 403 || status === 401) {
        router.replace("/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, page, router]);

  useEffect(() => {
    if (isLoadingSession) return;
    void fetchData();
  }, [fetchData, isLoadingSession]);

  async function toggleBan(userId: string, currentStatus: boolean) {
    setActionError(null);
    setBanningId(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/ban`, { is_active: !currentStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
    } catch (err) {
      setActionError(extractApiError(err) || "Could not update user.");
    } finally {
      setBanningId(null);
    }
  }

  if (isLoadingSession || (isLoading && !listError)) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <p className="text-slate-500 dark:text-slate-400">Loading admin…</p>
      </section>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-8">
      <header className="flex flex-wrap justify-between items-start gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Admin</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Signed in as {user?.email}
            {user?.email ? (
              <>
                {" "}
                ·{" "}
                <Link href="/dashboard" className="text-primary font-semibold hover:underline">
                  Back to dashboard
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <UserMenu variant="header" />
      </header>

      {listError ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          {listError}
        </p>
      ) : null}

      {actionError ? (
        <p
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      {stats ? (
        <section aria-label="Platform statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Active users", value: stats.totalUsers },
            { label: "Pro users", value: stats.proUsers },
            { label: "Documents", value: stats.totalDocuments },
            { label: "AI queries today", value: stats.totalAIQueriesToday },
          ].map((s) => (
            <article
              key={s.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
            >
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</h2>
              <p className="text-3xl font-black mt-1 tabular-nums">{s.value.toLocaleString()}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section aria-label="User directory" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <label htmlFor="admin-user-search" className="sr-only">
            Search users
          </label>
          <input
            id="admin-user-search"
            type="search"
            placeholder="Search by email or name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Registered users and moderation actions</caption>
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                {["User", "Plan", "Documents", "AI today", "Last active", "Joined", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No users match this search.
                  </td>
                </tr>
              ) : (
                users.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${row.id}`}
                        className="flex items-center gap-3 min-w-0 group rounded-lg outline-offset-2 focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {row.avatar_url ? (
                          <img
                            src={row.avatar_url}
                            alt={`Avatar for ${row.name?.trim() || row.email}`}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <span
                            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold shrink-0"
                            aria-hidden
                          >
                            {(row.name?.trim() || row.email || "?").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 text-left">
                          <span className="font-semibold text-slate-900 dark:text-white group-hover:text-primary block truncate">
                            {row.name?.trim() || "—"}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-xs truncate block">
                            {row.email}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.plan === "pro"
                            ? "inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary"
                            : "inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }
                      >
                        {row.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 tabular-nums">
                      {Number(row.documents_count ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 tabular-nums">
                      {Number(row.ai_queries_today ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {row.last_active_at
                        ? new Date(row.last_active_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.is_active
                            ? "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-700 dark:text-red-400"
                        }
                      >
                        {row.is_active ? "Active" : "Banned"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={banningId === row.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void toggleBan(row.id, row.is_active);
                        }}
                        className={
                          row.is_active
                            ? "text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
                            : "text-xs px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50"
                        }
                      >
                        {banningId === row.id ? "…" : row.is_active ? "Ban" : "Unban"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalUsers > PAGE_SIZE ? (
          <footer className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalUsers)} of {totalUsers}
            </p>
            <nav className="flex items-center gap-2" aria-label="Pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </nav>
          </footer>
        ) : null}
      </section>
    </motion.div>
  );
}
