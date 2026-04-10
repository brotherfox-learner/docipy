/** Pull a readable message from an axios error (Fastify uses `{ message, statusCode }`). */
export function extractApiError(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;

  if (!("response" in err)) {
    if ("message" in err && typeof (err as Error).message === "string") {
      return (err as Error).message;
    }
    return undefined;
  }

  const ax = err as { response?: { status?: number; data?: unknown } };
  const data = ax.response?.data as { message?: string; error?: string } | string | undefined;
  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message.length > 0) return data.message;
    if (typeof data.error === "string" && data.error.length > 0) return data.error;
  }
  if (typeof data === "string" && data.trim().length > 0) return data.trim();

  const status = ax.response?.status;
  if (status === 403) return "This feature requires a Pro plan. Please upgrade.";
  if (status === 401) return "Please sign in again.";
  if (status === 413) return "File is too large.";
  if (status === 503) return "This action needs cloud storage. Configure AWS S3 on the server or try again later.";
  if (status === 429) return "Too many requests. Try again in a moment.";

  return undefined;
}
