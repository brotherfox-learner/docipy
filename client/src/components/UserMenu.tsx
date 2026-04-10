"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

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

  useEffect(() => {
    setLoaded(false);
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
        src={src}
        alt={`Avatar of ${displayName}`}
        referrerPolicy="no-referrer"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100 z-10" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={onImageFailed}
      />
    </span>
  );
}

export function UserMenu({ variant = "header" }: UserMenuProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
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

  const displayName = user.name?.trim() || user.email?.split("@")[0] || "Account";
  const initialLetter = initialFromUser(user);

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
            displayName={displayName}
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
                displayName={displayName}
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
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-primary">{user.plan} plan</p>
            </div>
          </div>
          <Link
            role="menuitem"
            href="/"
            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined mr-2 align-middle text-[18px]">home</span>
            Home
          </Link>
          <Link
            role="menuitem"
            href="/dashboard"
            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined mr-2 align-middle text-[18px]">dashboard</span>
            Dashboard
          </Link>
          <Link
            role="menuitem"
            href="/settings"
            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined mr-2 align-middle text-[18px]">settings</span>
            Settings
          </Link>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined mr-2 text-[18px]">logout</span>
            Log out
          </button>
        </div>,
          document.body
        )}
    </div>
  );
}
