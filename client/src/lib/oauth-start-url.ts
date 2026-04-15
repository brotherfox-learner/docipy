/**
 * OAuth must start on the **same site** the user sees (e.g. Vercel) so that after GitHub/Google
 * redirects to `/api/auth/oauth/.../callback`, the Set-Cookie from the API response applies to
 * that host. Next.js rewrites `/api/*` to the real backend (see `next.config.ts`).
 *
 * If you use `NEXT_PUBLIC_API_URL=https://api.example.com` here, the browser leaves the web app,
 * the cookie is set on `api.example.com`, and the app on Vercel never receives `refresh_token`
 * → middleware keeps sending you to `/login?from=...`.
 */
export function getOAuthStartUrl(provider: "google" | "github"): string {
  if (typeof window === "undefined") {
    return `/api/auth/oauth/${provider}`;
  }
  const origin = window.location.origin.replace(/\/$/, "");
  return `${origin}/api/auth/oauth/${provider}`;
}
