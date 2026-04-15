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
  let data = ax.response?.data as { message?: string; error?: string } | string | ArrayBuffer | undefined;
  if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) {
    try {
      const txt = new TextDecoder().decode(data);
      const j = JSON.parse(txt) as { message?: string; error?: string };
      data = j;
    } catch {
      data = undefined;
    }
  }
  if (data && typeof data === "object" && !(data instanceof ArrayBuffer)) {
    const o = data as { message?: string; error?: string };
    if (typeof o.message === "string" && o.message.length > 0) return o.message;
    if (typeof o.error === "string" && o.error.length > 0) return o.error;
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
