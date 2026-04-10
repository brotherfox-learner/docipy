"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";
import {
  FREE_AI_QUERIES_PER_DAY,
  FREE_DOCUMENT_CAP,
} from "@/lib/plan-limits";
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

export default function SettingsPage() {
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
    void refreshUser().finally(() => {
      clearUpgradeQuery();
    });
  }, [refreshUser, clearUpgradeQuery]);

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
      setProfileError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setProfileError("Image must be 2 MB or smaller.");
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
      setProfileError("Name must be 1–100 characters.");
      return;
    }
    if (!avatarFile && !removeAvatar && avatarUrl.trim() !== "" && !isValidHttpUrl(avatarUrl.trim())) {
      setProfileError("Avatar URL must be empty or a valid http(s) URL.");
      return;
    }

    const nameChanged = trimmed !== (user?.name ?? "");
    const hadAvatar = Boolean(user?.avatar_url);
    let urlPatchNeeded = false;
    if (!avatarFile) {
      if (removeAvatar && hadAvatar) urlPatchNeeded = true;
      else if (!removeAvatar) {
        const t = avatarUrl.trim();
        if (t !== (user?.avatar_url ?? "")) urlPatchNeeded = true;
      }
    }
    const fileChanged = avatarFile !== null;

    if (!nameChanged && !urlPatchNeeded && !fileChanged) {
      setProfileSaved("No changes to save.");
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
          const t = avatarUrl.trim();
          if (t !== (user.avatar_url ?? "")) {
            patch.avatar_url = t === "" ? "" : t;
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await api.patch("/api/auth/me", patch);
      }

      await refreshUser();
      setAvatarFile(null);
      setRemoveAvatar(false);
      setProfileSaved("Profile updated.");
      setProfileConfirmOpen(false);
    } catch (err: unknown) {
      setProfileError(extractApiError(err) ?? "Could not update profile.");
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
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 100) {
      setPasswordError("New password must be 8–100 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
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
      setPasswordSaved("Password updated.");
      setPasswordConfirmOpen(false);
    } catch (err: unknown) {
      setPasswordError(extractApiError(err) ?? "Could not change password.");
      setPasswordConfirmOpen(false);
    } finally {
      setPasswordLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "usage", label: "Usage" },
    { id: "security", label: "Security" },
  ];

  if (!user) {
    return (
      <section className="max-w-2xl">
        <h1 className="text-2xl font-black tracking-tight mb-2">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Sign in to manage your account.</p>
      </section>
    );
  }

  const docCap = user.plan === "pro" ? null : FREE_DOCUMENT_CAP;
  const aiCap = user.plan === "pro" ? null : FREE_AI_QUERIES_PER_DAY;

  return (
    <section className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight mb-2">Settings</h1>
        {upgradeNotice ? (
          <p
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            Welcome to Pro — your plan is active. Limits have been updated across the app.
          </p>
        ) : null}
      </header>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            id={`settings-tab-${t.id}`}
            aria-controls={`settings-panel-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === t.id
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" ? (
        <article
          id="settings-panel-profile"
          role="tabpanel"
          aria-labelledby="settings-tab-profile"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 space-y-4"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Signed in as <span className="font-medium text-slate-700 dark:text-slate-300">{user.email}</span>
            {user.oauth_provider ? (
              <span className="block mt-1">Linked with {user.oauth_provider}.</span>
            ) : null}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="shrink-0">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Preview</p>
              <div className="size-28 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                {previewImageSrc ? (
                  <img
                    src={previewImageSrc}
                    alt="Profile picture preview"
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
                <label htmlFor="settings-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Display name
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
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Photo from device</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
                  JPEG, PNG, or WebP · max 2 MB for the file you pick. You can drag, zoom, and crop in a circle before it is
                  uploaded. Requires AWS S3 configured on the server (same as document uploads).
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden>
                      upload
                    </span>
                    Choose image
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onAvatarFileChange} />
                  </label>
                  {(user.avatar_url || avatarFile || (avatarUrl.trim() && !removeAvatar)) ? (
                    <button
                      type="button"
                      onClick={handleRemoveAvatarClick}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
                {avatarFile ? (
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Selected: {avatarFile.name}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="settings-avatar-url" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Or image URL
                </label>
                <input
                  id="settings-avatar-url"
                  name="avatar_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setRemoveAvatar(false);
                  }}
                  disabled={Boolean(avatarFile)}
                  className={`${inputClass} disabled:opacity-60`}
                />
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Leave empty to clear when you save (or use Remove photo). Disabled while a file is selected.
                </p>
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                Save profile
              </button>
            </form>
          </div>
        </article>
      ) : null}

      {activeTab === "usage" ? (
        <article
          id="settings-panel-usage"
          role="tabpanel"
          aria-labelledby="settings-tab-usage"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Usage</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">Documents</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">
                {user.documents_count}
                {docCap !== null ? ` / ${docCap} (free cap)` : " (Pro)"}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">AI queries (today)</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">
                {user.ai_queries_today}
                {aiCap !== null ? ` / ${aiCap} (free cap)` : " (Pro)"}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">Quizzes generated</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{user.quiz_generated}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
              <dt className="text-slate-500 dark:text-slate-400">Flashcards generated</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">{user.flashcards_generated}</dd>
            </div>
          </dl>
          {user.plan === "free" ? (
            <p className="text-sm">
              <Link href="/pricing" className="text-primary font-semibold hover:underline">
                View pricing
              </Link>{" "}
              to upgrade and raise limits.
            </p>
          ) : null}
        </article>
      ) : null}

      {activeTab === "security" ? (
        <div className="space-y-6">
          {user.has_password ? (
            <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Change password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Separate from the email reset link. Enter your current password, then choose a new one.
              </p>
              <form onSubmit={openPasswordConfirm} className="space-y-4">
                <div>
                  <label
                    htmlFor="settings-current-password"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Current password
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
                  <label htmlFor="settings-new-password" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    New password
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
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Confirm new password
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
                  className="rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  Update password
                </button>
              </form>
            </article>
          ) : (
            <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This account signs in with OAuth and does not have a Docipy password to change here. Continue signing in
                with your provider ({user.oauth_provider ?? "Google or GitHub"}).
              </p>
            </article>
          )}

          <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Session</h2>
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-800 dark:text-red-200 hover:opacity-95"
            >
              Log out
            </button>
          </article>
        </div>
      ) : null}

      <AvatarCropDialog
        open={avatarCrop.open}
        imageSrc={avatarCrop.src}
        onClose={dismissAvatarCrop}
        onComplete={handleAvatarCropComplete}
      />

      <ConfirmDialog
        open={profileConfirmOpen}
        title="Save profile?"
        description="Your display name and profile photo will be updated."
        confirmLabel="Save"
        cancelLabel="Cancel"
        variant="primary"
        pending={profileLoading}
        onClose={() => !profileLoading && setProfileConfirmOpen(false)}
        onConfirm={executeProfileSave}
      />

      <ConfirmDialog
        open={passwordConfirmOpen}
        title="Change password?"
        description="You will use the new password the next time you sign in with email."
        confirmLabel="Change password"
        cancelLabel="Cancel"
        variant="primary"
        pending={passwordLoading}
        onClose={() => !passwordLoading && setPasswordConfirmOpen(false)}
        onConfirm={executePasswordChange}
      />

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Log out?"
        description="You will need to sign in again to access your workspace."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
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
