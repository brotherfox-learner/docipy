"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

type UserMenuProps = {
  variant?: "header" | "navbar";
};

function firstCharOf(text: string) {
  const ch = [...text.trim()][0];
  return ch ? ch.toUpperCase() : "";
}

function initialFromUser(user: { name?: string | null; email?: string | null }) {
  return (
    firstCharOf(user.name?.trim() || "") ||
    firstCharOf(user.email?.split("@")[0] || "") ||
    firstCharOf(user.email || "") ||
    "?"
  );
}

/** Shows a neutral placeholder while the image loads; parent falls back to initials if the image errors. */
function AvatarImageOrPlaceholder({
  src,
  displayName,
  size,
  onImageFailed,
}: {
  src: string;
  displayName: string;
  size: "sm" | "md";
  onImageFailed: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  /** Cached images often finish before onLoad is attached; read .complete so we do not stay on the gray placeholder. */
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const box = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const border =
    size === "sm"
      ? "border-slate-300 dark:border-slate-600"
      : "border-slate-200 dark:border-slate-600";

  return (
    <span className={`relative ${box} shrink-0 overflow-hidden rounded-full border ${border}`}>
      {!loaded ? (
        <span className="absolute inset-0 bg-slate-200 dark:bg-slate-600" aria-hidden />
      ) : null}
      <img
        ref={imgRef}
        src={src}
        alt={displayName}
        className={`absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={onImageFailed}
      />
    </span>
  );
}

export function UserMenu({ variant = "header" }: UserMenuProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const t = useTranslations("userMenu");
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, right: 0 });

  const avatarSrc = user?.avatar_url?.trim() || null;

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarSrc]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      const inRoot = rootRef.current?.contains(target);
      const inMenu = (target as Element).closest?.("[data-user-menu]");
      if (!inRoot && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const scrollEl = rootRef.current?.closest("main");
    const onScroll = () => setOpen(false);
    scrollEl?.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollEl?.removeEventListener("scroll", onScroll);
  }, [open]);

  const btnClass =
    variant === "navbar"
      ? "flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      : "flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors";

  if (!user) {
    return null;
  }

  const displayName = user.name?.trim() || user.email?.split("@")[0] || t("account");
  const initialLetter = initialFromUser(user);
  const avatarAlt = t("avatarOf", { name: displayName });

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className={btnClass}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {avatarSrc && !avatarFailed ? (
          <AvatarImageOrPlaceholder
            src={avatarSrc}
            displayName={avatarAlt}
            size="sm"
            onImageFailed={() => setAvatarFailed(true)}
          />
        ) : (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/15 text-sm font-bold text-primary"
            aria-hidden
          >
            {initialLetter}
          </span>
        )}
        {variant === "navbar" && (
          <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 dark:text-slate-200 sm:inline">
            {displayName}
          </span>
        )}
        <span className="material-symbols-outlined text-slate-500 text-[20px]">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="menu"
            data-user-menu
            className="w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            style={{
              position: "fixed",
              top: dropdownStyle.top,
              right: dropdownStyle.right,
              zIndex: 9999,
            }}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              {avatarSrc && !avatarFailed ? (
                <AvatarImageOrPlaceholder
                  src={avatarSrc}
                  displayName={avatarAlt}
                  size="md"
                  onImageFailed={() => setAvatarFailed(true)}
                />
              ) : (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/15 text-base font-bold text-primary"
                  aria-hidden
                >
                  {initialLetter}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {user.plan} {t("planSuffix")}
                </p>
              </div>
            </div>
            <Link
              role="menuitem"
              href="/"
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              <span className="material-symbols-outlined mr-2 align-middle text-[18px]">home</span>
              {t("home")}
            </Link>
            <Link
              role="menuitem"
              href="/dashboard"
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              <span className="material-symbols-outlined mr-2 align-middle text-[18px]">dashboard</span>
              {t("dashboard")}
            </Link>
            <Link
              role="menuitem"
              href="/settings"
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              <span className="material-symbols-outlined mr-2 align-middle text-[18px]">settings</span>
              {t("settings")}
            </Link>
            {user.is_admin ? (
              <>
                <Link
                  role="menuitem"
                  href="/admin"
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  <span className="material-symbols-outlined mr-2 align-middle text-[18px]">
                    admin_panel_settings
                  </span>
                  {t("admin")}
                </Link>
                <Link
                  role="menuitem"
                  href="/admin/analytics"
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  <span className="material-symbols-outlined mr-2 align-middle text-[18px]">bar_chart</span>
                  {t("analytics")}
                </Link>
              </>
            ) : null}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <LocaleSwitcher variant="menu" menuItem />
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={handleLogout}
            >
              <span className="material-symbols-outlined mr-2 text-[18px]">logout</span>
              {t("logOut")}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
