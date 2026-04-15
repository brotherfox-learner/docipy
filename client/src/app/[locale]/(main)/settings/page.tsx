"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";
import {
  FREE_AI_QUERIES_PER_DAY,
  FREE_DOCUMENT_CAP,
} from "@/lib/plan-limits";
import { getLevelFromTotalXp, getXpProgressInCurrentLevel } from "@/lib/learning-level";
import type { LearningDashboardStats } from "@/types/learning";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type SettingsTab = "profile" | "usage" | "security";

type SubscriptionDetail = {
  plan?: string;
  status?: string;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  stripe_subscription_status?: string;
};

function formatBillingPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { dateStyle: "long" });
}

export default function SettingsPage() {
  const st = useTranslations("settings");
  const { user, logout, refreshUser } = useAuth();
  const [upgradeNotice, setUpgradeNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileConfirmOpen, setProfileConfirmOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const [learnStats, setLearnStats] = useState<LearningDashboardStats | null>(null);
  const [learnStatsLoading, setLearnStatsLoading] = useState(false);

  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionActionError, setSubscriptionActionError] = useState("");
  const [cancelSubPending, setCancelSubPending] = useState(false);
  const [resumeSubPending, setResumeSubPending] = useState(false);
  const [cancelSubConfirmOpen, setCancelSubConfirmOpen] = useState(false);

  const [avatarCrop, setAvatarCrop] = useState<{ open: boolean; src: string | null }>({
    open: false,
    src: null,
  });

  const dismissAvatarCrop = useCallback(() => {
    setAvatarCrop((prev) => {
      if (prev.src) URL.revokeObjectURL(prev.src);
      return { open: false, src: null };
    });
  }, []);

  const handleAvatarCropComplete = useCallback(
    (file: File) => {
      dismissAvatarCrop();
      setAvatarFile(file);
    },
    [dismissAvatarCrop]
  );

  const clearUpgradeQuery = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("upgraded")) return;
    url.searchParams.delete("upgraded");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "true") return;
    setUpgradeNotice(true);
    void (async () => {
      try {
        await api.post("/api/payment/subscription/sync");
      } catch {
        /* Webhook may have already upgraded; still refresh below. */
      } finally {
        await refreshUser();
        clearUpgradeQuery();
      }
    })();
  }, [refreshUser, clearUpgradeQuery]);

  useEffect(() => {
    if (!user || activeTab !== "profile") return;
    let cancelled = false;
    setLearnStatsLoading(true);
    void (async () => {
      try {
        const { data } = await api.get("/api/learning/dashboard-stats");
        if (!cancelled) {
          setLearnStats(data.data as LearningDashboardStats);
        }
      } catch {
        if (!cancelled) setLearnStats(null);
      } finally {
        if (!cancelled) setLearnStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activeTab]);

  useEffect(() => {
    if (!user || user.plan !== "pro") {
      setSubscription(null);
      setSubscriptionLoading(false);
      return;
    }
    let cancelled = false;
    setSubscriptionLoading(true);
    setSubscriptionActionError("");
    void (async () => {
      try {
        const { data } = await api.get<{ data: SubscriptionDetail | null }>("/api/payment/subscription");
        if (!cancelled) setSubscription(data.data ?? null);
      } catch {
        if (!cancelled) {
          setSubscription(null);
          setSubscriptionActionError(st("subLoadFailed"));
        }
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, user?.plan, st]);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setAvatarUrl(user.avatar_url ?? "");
    setAvatarFile(null);
    setRemoveAvatar(false);
    setAvatarCrop((prev) => {
      if (prev.src) URL.revokeObjectURL(prev.src);
      return { open: false, src: null };
    });
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const previewImageSrc =
    avatarPreviewUrl ??
    (removeAvatar
      ? null
      : avatarUrl.trim() && isValidHttpUrl(avatarUrl.trim())
        ? avatarUrl.trim()
        : user?.avatar_url?.trim() || null);

  function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setProfileError(st("errImageType"));
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setProfileError(st("errImageSize"));
      return;
    }
    setProfileError("");
    setRemoveAvatar(false);
    const src = URL.createObjectURL(f);
    setAvatarCrop({ open: true, src });
  }

  function handleRemoveAvatarClick() {
    setAvatarFile(null);
    setAvatarUrl("");
    setRemoveAvatar(true);
    setProfileError("");
  }

  function openProfileConfirm(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSaved("");
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      setProfileError(st("errNameLength"));
      return;
    }
    if (!avatarFile && !removeAvatar && avatarUrl.trim() !== "" && !isValidHttpUrl(avatarUrl.trim())) {
      setProfileError(st("errAvatarUrl"));
      return;
    }

    const nameChanged = trimmed !== (user?.name ?? "");
    const hadAvatar = Boolean(user?.avatar_url);
    let urlPatchNeeded = false;
    if (!avatarFile) {
      if (removeAvatar && hadAvatar) urlPatchNeeded = true;
      else if (!removeAvatar) {
        const urlTrim = avatarUrl.trim();
        if (urlTrim !== (user?.avatar_url ?? "")) urlPatchNeeded = true;
      }
    }
    const fileChanged = avatarFile !== null;

    if (!nameChanged && !urlPatchNeeded && !fileChanged) {
      setProfileSaved(st("noChanges"));
      return;
    }

    setProfileConfirmOpen(true);
  }

  async function executeProfileSave() {
    if (!user) return;
    const trimmed = name.trim();
    setProfileLoading(true);
    setProfileError("");
    try {
      if (avatarFile) {
        const body = new FormData();
        body.append("avatar", avatarFile);
        await api.post("/api/auth/me/avatar", body, { timeout: 60_000 });
      }

      const patch: { name?: string; avatar_url?: string } = {};
      if (trimmed !== user.name) patch.name = trimmed;

      if (!avatarFile) {
        if (removeAvatar && user.avatar_url) {
          patch.avatar_url = "";
        } else if (!removeAvatar) {
          const urlTrim = avatarUrl.trim();
          if (urlTrim !== (user.avatar_url ?? "")) {
            patch.avatar_url = urlTrim === "" ? "" : urlTrim;
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await api.patch("/api/auth/me", patch);
      }

      await refreshUser();
      setAvatarFile(null);
      setRemoveAvatar(false);
      setProfileSaved(st("profileUpdated"));
      setProfileConfirmOpen(false);
    } catch (err: unknown) {
      setProfileError(extractApiError(err) ?? st("profileUpdateFailed"));
      setProfileConfirmOpen(false);
    } finally {
      setProfileLoading(false);
    }
  }

  function openPasswordConfirm(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved("");
    if (currentPassword.length < 1) {
      setPasswordError(st("errCurrentPassword"));
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 100) {
      setPasswordError(st("errNewPasswordLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(st("errPasswordMismatch"));
      return;
    }
    setPasswordConfirmOpen(true);
  }

  async function executePasswordChange() {
    setPasswordLoading(true);
    setPasswordError("");
    try {
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(st("passwordUpdated"));
      setPasswordConfirmOpen(false);
    } catch (err: unknown) {
      setPasswordError(extractApiError(err) ?? st("passwordChangeFailed"));
      setPasswordConfirmOpen(false);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function executeCancelSubscription() {
    setCancelSubPending(true);
    setSubscriptionActionError("");
    try {
      const { data } = await api.post<{
        data: { cancel_at_period_end: boolean; current_period_end: string };
      }>("/api/payment/subscription/cancel");
      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              cancel_at_period_end: data.data.cancel_at_period_end,
              current_period_end: data.data.current_period_end,
            }
          : prev
      );
      setCancelSubConfirmOpen(false);
      await refreshUser();
    } catch (err: unknown) {
      setSubscriptionActionError(extractApiError(err) ?? st("subCancelFailed"));
      setCancelSubConfirmOpen(false);
    } finally {
      setCancelSubPending(false);
    }
  }

  async function executeResumeSubscription() {
    setResumeSubPending(true);
    setSubscriptionActionError("");
    try {
      const { data } = await api.post<{
        data: { cancel_at_period_end: boolean; current_period_end: string };
      }>("/api/payment/subscription/resume");
      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              cancel_at_period_end: data.data.cancel_at_period_end,
              current_period_end: data.data.current_period_end,
            }
          : prev
      );
      await refreshUser();
    } catch (err: unknown) {
      setSubscriptionActionError(extractApiError(err) ?? st("subResumeFailed"));
    } finally {
      setResumeSubPending(false);
    }
  }

  const goToBillingSection = useCallback(() => {
    setActiveTab("usage");
    setSubscriptionActionError("");
    requestAnimationFrame(() => {
      document.getElementById("settings-pro-subscription-heading")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const inputClass =
    "w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100";

  const panelClass =
    "relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_30px_80px_-40px_rgba(2,6,23,0.9)]";

  const labelClass =
    "mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400";

  const secondaryButtonClass =
    "rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]";

  const primaryButtonClass =
    "rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_30px_-18px_rgba(37,99,235,0.9)] transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-50";

  const tabs: { id: SettingsTab; label: string; eyebrow: string; description: string }[] = [
    {
      id: "profile",
      label: st("tabProfileLabel"),
      eyebrow: st("tabProfileEyebrow"),
      description: st("tabProfileDesc"),
    },
    {
      id: "usage",
      label: st("tabUsageLabel"),
      eyebrow: st("tabUsageEyebrow"),
      description: st("tabUsageDesc"),
    },
    {
      id: "security",
      label: st("tabSecurityLabel"),
      eyebrow: st("tabSecurityEyebrow"),
      description: st("tabSecurityDesc"),
    },
  ];

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl">
        <div className={`${panelClass} px-8 py-10`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">{st("guestEyebrow")}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {st("guestTitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{st("guestBody")}</p>
        </div>
      </section>
    );
  }

  const docCap = user.plan === "pro" ? null : FREE_DOCUMENT_CAP;
  const aiCap = user.plan === "pro" ? null : FREE_AI_QUERIES_PER_DAY;
  const currentTabMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section className="relative mx-auto max-w-6xl pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_top_right,rgba(79,70,229,0.18),transparent_34%)]" />

      <header className={`${panelClass} px-6 py-8 sm:px-8 lg:px-10 lg:py-10`}>
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.45),transparent)]" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_320px]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">{st("headerEyebrow")}</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
              {st("headerTitle")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{st("headerBody")}</p>
            {upgradeNotice ? (
          <p
            className="mt-5 inline-flex rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200"
            role="status"
          >
                {st("upgradeNotice")}
          </p>
        ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {st("planLabel")}
              </p>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {user.plan === "pro" ? st("planPro") : st("planFree")}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {user.plan === "pro" ? st("planProDesc") : st("planFreeDesc")}
              </p>
              {user.plan === "pro" ? (
                <button
                  type="button"
                  onClick={goToBillingSection}
                  className="mt-4 w-full rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-primary transition hover:bg-primary/15 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/15"
                >
                  {st("renewalCancel")}
                </button>
              ) : null}
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {st("accountLabel")}
              </p>
              <p className="mt-3 truncate text-sm font-semibold text-slate-900 dark:text-white">{user.email}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {user.oauth_provider
                  ? st("connectedWith", { provider: user.oauth_provider })
                  : st("emailPasswordAccess")}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {st("workspaceLabel")}
              </p>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{user.documents_count}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{st("documentsStored")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div role="tablist" aria-label={st("tabsAria")} className={`${panelClass} p-3`}>
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  id={`settings-tab-${tab.id}`}
                  aria-controls={`settings-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-[22px] px-4 py-4 text-left transition ${
                    activeTab === tab.id
                      ? "bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(15,23,42,0.02))] text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.22)] dark:bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(255,255,255,0.02))] dark:text-white dark:shadow-[inset_0_0_0_1px_rgba(125,211,252,0.18)]"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/90 dark:text-sky-300/90">
                    {tab.eyebrow}
                  </p>
                  <p className="mt-2 text-base font-bold">{tab.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{tab.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className={`${panelClass} p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              {st("activeSection")}
            </p>
            <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {currentTabMeta.label}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {currentTabMeta.description}
            </p>
          </div>
        </aside>

        <div className="min-w-0">

      {activeTab === "profile" ? (
        <article
          id="settings-panel-profile"
          role="tabpanel"
          aria-labelledby="settings-tab-profile"
          className={`${panelClass} p-6 sm:p-7 space-y-6`}
        >   <div className="flex flex-col gap-6 rounded-[24px] border border-slate-200/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-start">
        <div className="shrink-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            {st("preview")}
          </p>
          <div className="flex size-28 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-slate-100 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-900">
            {previewImageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImageSrc}
                alt={st("profilePicAlt")}
                className="size-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500" aria-hidden>
                person
              </span>
            )}
          </div>
        </div>

        <form onSubmit={openProfileConfirm} className="flex-1 space-y-4 min-w-0">
          <div>
            <label htmlFor="settings-name" className={labelClass}>
              {st("displayName")}
            </label>
            <input
              id="settings-name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              maxLength={100}
            />
          </div>

          <div>
            <p className={labelClass}>{st("photoFromDevice")}</p>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-500">{st("photoHelp")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className={secondaryButtonClass + " inline-flex cursor-pointer items-center gap-2"}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  upload
                </span>
                {st("chooseImage")}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onAvatarFileChange} />
              </label>
              {(user.avatar_url || avatarFile || (avatarUrl.trim() && !removeAvatar)) ? (
                <button
                  type="button"
                  onClick={handleRemoveAvatarClick}
                  className={secondaryButtonClass}
                >
                  {st("removePhoto")}
                </button>
              ) : null}
            </div>
            {avatarFile ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                {st("selectedFile", { name: avatarFile.name })}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="settings-avatar-url" className={labelClass}>
              {st("hostedImageUrl")}
            </label>
            <input
              id="settings-avatar-url"
              name="avatar_url"
              type="url"
              inputMode="url"
              placeholder={st("urlPlaceholder")}
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setRemoveAvatar(false);
              }}
              disabled={Boolean(avatarFile)}
              className={`${inputClass} disabled:opacity-60`}
            />
            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{st("urlHelp")}</p>
          </div>

          {profileError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {profileError}
            </p>
          ) : null}
          {profileSaved ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
              {profileSaved}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={profileLoading}
            className={primaryButtonClass}
          >
            {st("saveProfile")}
          </button>
        </form>
      </div>
          {/* <p className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            Signed in as <span className="font-medium text-slate-700 dark:text-slate-300">{user.email}</span>
            {user.oauth_provider ? (
              <span className="block mt-1">Linked with {user.oauth_provider}.</span>
            ) : null}
          </p> */}

          {user.plan === "pro" ? (
            <section
              aria-labelledby="settings-profile-billing-heading"
              className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <h2
                id="settings-profile-billing-heading"
                className="text-sm font-bold text-slate-900 dark:text-white"
              >
                {st("proBillingTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {st("proBillingLead")}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{st("billingTabName")}</span>
                {st("proBillingTrail")}
              </p>
              <button type="button" onClick={goToBillingSection} className={`${primaryButtonClass} mt-4 w-full sm:w-auto`}>
                {st("openBillingControls")}
              </button>
            </section>
          ) : null}

          <section
            aria-labelledby="settings-learning-heading"
            className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(241,245,249,0.82))] p-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.58))]"
          >
            <h2 id="settings-learning-heading" className="text-sm font-bold text-slate-900 dark:text-white">
              {st("learningTitle")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{st("learningIntro")}</p>
            {learnStatsLoading ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{st("loadingStats")}</p>
            ) : learnStats ? (
              <>
                {(() => {
                  const lvl = getLevelFromTotalXp(learnStats.total_xp);
                  const bar = getXpProgressInCurrentLevel(learnStats.total_xp);
                  return (
                    <div className="mt-3 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-3 dark:border-white/10 dark:bg-slate-900/50">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <span>{st("levelShort", { level: lvl })}</span>
                        <span className="tabular-nums text-slate-500 dark:text-slate-400">
                          {st("levelTotalXp", { xp: learnStats.total_xp })}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#6366f1_100%)]"
                          style={{ width: `${bar.percentInLevel}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {learnStats.total_xp > 0 && bar.xpIntoLevel === 0
                          ? st("xpStartShort", { level: lvl, next: lvl + 1 })
                          : st("xpUntilShort", { amount: bar.xpToNextLevel, next: lvl + 1 })}
                      </p>
                    </div>
                  );
                })()}
                <ul className="m-0 mt-3 list-none space-y-2 p-0 text-xs">
                  <li className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{st("achFirstStep")}</span>
                    <span>
                      {learnStats.nodes_completed >= 1
                        ? st("achievementUnlocked")
                        : st("achNodesShort", { current: learnStats.nodes_completed })}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{st("achOnFire")}</span>
                    <span>
                      {learnStats.best_streak >= 3
                        ? st("achievementUnlocked")
                        : st("achStreakShort", { current: Math.min(learnStats.best_streak, 3) })}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{st("achScholar")}</span>
                    <span>
                      {learnStats.total_xp >= 150
                        ? st("achievementUnlocked")
                        : st("achXpShort", { current: Math.min(learnStats.total_xp, 150) })}
                    </span>
                  </li>
                </ul>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{st("learningEmpty")}</p>
            )}
          </section>

       
        </article>
      ) : null}

      {activeTab === "usage" ? (
        <article
          id="settings-panel-usage"
          role="tabpanel"
          aria-labelledby="settings-tab-usage"
          className={`${panelClass} p-6 sm:p-7 space-y-6`}
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{st("usageTitle")}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">{st("usageDocuments")}</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">
                {user.documents_count}
                {docCap !== null ? st("usageFreeCap", { cap: docCap }) : st("usageProSuffix")}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">{st("usageAiToday")}</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">
                {user.ai_queries_today}
                {aiCap !== null ? st("usageFreeCap", { cap: aiCap }) : st("usageProSuffix")}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">{st("usageQuizzes")}</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{user.quiz_generated}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">{st("usageFlashcards")}</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{user.flashcards_generated}</dd>
            </div>
          </dl>
          {user.plan === "free" ? (
            <p className="text-sm">
              <Link href="/pricing" className="font-semibold text-primary hover:underline">
                {st("upgradeCta")}
              </Link>{" "}
              {st("upgradeSuffix")}
            </p>
          ) : (
            <section
              aria-labelledby="settings-pro-subscription-heading"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 p-4 dark:bg-slate-800/40"
            >
              <h2
                id="settings-pro-subscription-heading"
                className="text-sm font-bold text-slate-900 dark:text-white"
              >
                {st("subTitle")}
              </h2>
              {subscriptionLoading ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{st("loadingBilling")}</p>
              ) : subscription?.stripe_subscription_id ? (
                <>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {subscription.cancel_at_period_end === true ? (
                      <>
                        {st("subCancelUntil", {
                          date:
                            formatBillingPeriodEnd(subscription.current_period_end) ?? st("subPeriodFallback"),
                        })}
                      </>
                    ) : (
                      <>
                        {st("subPeriodEnds", {
                          date:
                            formatBillingPeriodEnd(subscription.current_period_end) ?? st("dateUnknown"),
                        })}
                        {subscription.stripe_subscription_status == null &&
                        subscription.cancel_at_period_end == null ? (
                          <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                            {st("subStripeNote")}
                          </span>
                        ) : null}
                      </>
                    )}
                  </p>
                  {subscription.stripe_subscription_status ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {st("stripeStatus", { status: subscription.stripe_subscription_status })}
                    </p>
                  ) : null}
                  {subscriptionActionError ? (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                      {subscriptionActionError}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {subscription.cancel_at_period_end === true ? (
                      <button
                        type="button"
                        disabled={resumeSubPending}
                        onClick={() => void executeResumeSubscription()}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                      >
                        {resumeSubPending ? st("resumeSaving") : st("keepPro")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={cancelSubPending}
                        onClick={() => {
                          setSubscriptionActionError("");
                          setCancelSubConfirmOpen(true);
                        }}
                        className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-800 dark:text-red-200 hover:opacity-95 disabled:opacity-50"
                      >
                        {st("cancelSubscription")}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{st("subNoDetails")}</p>
              )}
            </section>
          )}
        </article>
      ) : null}

      {activeTab === "security" ? (
        <div className="space-y-6">
          {user.has_password ? (
            <article className={`${panelClass} p-6 sm:p-7 space-y-6`}>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{st("changePasswordTitle")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{st("changePasswordIntro")}</p>
              <form onSubmit={openPasswordConfirm} className="space-y-4">
                <div>
                  <label
                    htmlFor="settings-current-password"
                    className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    {st("currentPassword")}
                  </label>
                  <input
                    id="settings-current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-new-password"
                    className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    {st("newPassword")}
                  </label>
                  <input
                    id="settings-new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-confirm-password"
                    className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    {st("confirmNewPassword")}
                  </label>
                  <input
                    id="settings-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {passwordError ? (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {passwordError}
                  </p>
                ) : null}
                {passwordSaved ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
                    {passwordSaved}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className={primaryButtonClass}
                >
                  {st("updatePassword")}
                </button>
              </form>
            </article>
          ) : (
            <article className={`${panelClass} p-6 sm:p-7`}>
              <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{st("oauthPasswordTitle")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {st("oauthPasswordBody", {
                  provider: user.oauth_provider ?? st("oauthProviderFallback"),
                })}
              </p>
            </article>
          )}

          <article className={`${panelClass} p-6 sm:p-7`}>
            <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{st("sessionTitle")}</h2>
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-800 dark:text-red-200 hover:opacity-95"
            >
              {st("logOut")}
            </button>
          </article>
        </div>
      ) : null}

        </div>
      </div>

      <AvatarCropDialog
        open={avatarCrop.open}
        imageSrc={avatarCrop.src}
        onClose={dismissAvatarCrop}
        onComplete={handleAvatarCropComplete}
      />

      <ConfirmDialog
        open={profileConfirmOpen}
        title={st("confirmSaveProfileTitle")}
        description={st("confirmSaveProfileDesc")}
        confirmLabel={st("save")}
        cancelLabel={st("cancel")}
        variant="primary"
        pending={profileLoading}
        onClose={() => !profileLoading && setProfileConfirmOpen(false)}
        onConfirm={executeProfileSave}
      />

      <ConfirmDialog
        open={passwordConfirmOpen}
        title={st("confirmPasswordTitle")}
        description={st("confirmPasswordDesc")}
        confirmLabel={st("changePassword")}
        cancelLabel={st("cancel")}
        variant="primary"
        pending={passwordLoading}
        onClose={() => !passwordLoading && setPasswordConfirmOpen(false)}
        onConfirm={executePasswordChange}
      />

      <ConfirmDialog
        open={cancelSubConfirmOpen}
        title={st("confirmCancelSubTitle")}
        description={st("confirmCancelSubDesc")}
        confirmLabel={st("cancelAtPeriodEnd")}
        cancelLabel={st("keepProBtn")}
        variant="danger"
        pending={cancelSubPending}
        onClose={() => !cancelSubPending && setCancelSubConfirmOpen(false)}
        onConfirm={() => void executeCancelSubscription()}
      />

      <ConfirmDialog
        open={logoutConfirmOpen}
        title={st("confirmLogoutTitle")}
        description={st("confirmLogoutDesc")}
        confirmLabel={st("logOut")}
        cancelLabel={st("staySignedIn")}
        variant="danger"
        pending={false}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          void logout();
        }}
      />
    </section>
  );
}
