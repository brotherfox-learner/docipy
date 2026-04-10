"use client";

type SessionLoadingScreenProps = {
  message?: string;
  ariaLabel?: string;
};

/**
 * Full-viewport gate while the first refresh runs (access token lives in memory only).
 */
export function SessionLoadingScreen({
  message = "Restoring session…",
  ariaLabel = "Restoring session",
}: SessionLoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background-light dark:bg-background-dark"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
