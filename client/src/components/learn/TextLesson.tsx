"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { api, getAccessToken, setAccessToken } from "@/lib/api";

type TextLessonProps = {
  body: string;
  keyPoints: string[];
  language?: "en" | "th";
};

function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  return raw.replace(/\/+$/, "");
}

function ttsUrl(): string {
  const base = apiOrigin();
  return base ? `${base}/api/tts/synthesize` : "/api/tts/synthesize";
}

function resolveVoice(language: "en" | "th", voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const langPrefix = language === "th" ? "th" : "en";
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith(langPrefix)) ??
    voices.find((voice) => voice.name.toLowerCase().includes(language === "th" ? "thai" : "english")) ??
    voices.find((voice) => voice.lang.toLowerCase().includes(langPrefix)) ??
    null
  );
}

/** When Edge TTS fails, use the browser/OS speech engine so lessons still have sound. */
function speakWithDevice(
  text: string,
  language: "en" | "th",
  onEnd: () => void
): { ok: true } | { ok: false; reason: string } {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { ok: false, reason: "This browser does not support speech synthesis." };
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "th" ? "th-TH" : "en-US";
  utterance.rate = language === "th" ? 0.95 : 1;
  const voice = resolveVoice(language, window.speechSynthesis.getVoices());
  if (language === "th" && !voice) {
    return {
      ok: false,
      reason: "No Thai system voice is available. Try another browser or install a Thai voice pack.",
    };
  }
  if (voice) utterance.voice = voice;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
  return { ok: true };
}

export function TextLesson({ body, keyPoints, language = "en" }: TextLessonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackHint, setFallbackHint] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanupPlayback = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSpeaking(false);
    setLoading(false);
  }, []);

  const stop = useCallback(() => {
    cleanupPlayback();
    setFallbackHint(null);
  }, [cleanupPlayback]);

  useEffect(() => {
    return () => cleanupPlayback();
  }, [cleanupPlayback]);

  async function fetchTts(authorization: string, text: string, lang: "en" | "th", signal: AbortSignal) {
    return fetch(ttsUrl(), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({ text, language: lang }),
      signal,
    });
  }

  async function startReadAloud() {
    if (typeof window === "undefined") return;

    stop();
    setError(null);
    setFallbackHint(null);

    const text = [body.replace(/[#*_`]/g, " "), ...keyPoints].join(". ").trim();
    if (!text) {
      setError("There is no lesson text to read yet.");
      return;
    }

    let token = getAccessToken();
    if (!token) {
      setError("Sign in to use read aloud.");
      return;
    }

    setLoading(true);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      let res = await fetchTts(`Bearer ${token}`, text, language, signal);

      if (res.status === 401) {
        try {
          const { data } = await api.post<{ data: { accessToken: string } }>("/api/auth/refresh");
          setAccessToken(data.data.accessToken);
          token = getAccessToken();
          if (token) {
            res = await fetchTts(`Bearer ${token}`, text, language, signal);
          }
        } catch {
          setError("Your session expired. Sign in again.");
          setLoading(false);
          return;
        }
      }

      const ct = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        let message = `Read aloud failed (${res.status}).`;
        try {
          if (ct.includes("application/json")) {
            const j = (await res.json()) as { message?: string };
            if (typeof j.message === "string" && j.message.length > 0) message = j.message;
          } else {
            const t = await res.text();
            if (t.length > 0 && t.length < 500) message = t;
          }
        } catch {
          /* keep default */
        }
        throw new Error(message);
      }

      if (!ct.includes("audio/mpeg") && !ct.includes("audio/mp3") && !ct.includes("octet-stream")) {
        const raw = await res.text();
        let parsedMsg: string | null = null;
        try {
          const j = JSON.parse(raw) as { message?: string };
          if (typeof j.message === "string" && j.message.length > 0) parsedMsg = j.message;
        } catch {
          /* not JSON */
        }
        throw new Error(
          parsedMsg ?? "Server did not return audio. Check that the API server is running and logged in."
        );
      }

      const blob = await res.blob();
      if (blob.size < 200) {
        throw new Error("Received empty or invalid audio from the server.");
      }

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio();
      audioRef.current = audio;
      audio.preload = "auto";
      audio.setAttribute("playsinline", "");
      audio.volume = 1;
      audio.src = url;
      audio.load();

      const failPlayback = (msg: string) => {
        setError(msg);
        cleanupPlayback();
      };

      audio.onended = () => {
        cleanupPlayback();
      };

      audio.onerror = () => {
        failPlayback("Could not decode or play the audio stream.");
      };

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const checkDuration = (): boolean => {
          const d = audio.duration;
          return Number.isFinite(d) && d > 0 && d !== Number.POSITIVE_INFINITY;
        };

        const finish = (ok: boolean, err?: Error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          audio.removeEventListener("loadedmetadata", onMeta);
          audio.removeEventListener("canplay", onCanPlay);
          audio.removeEventListener("error", onErr);
          if (ok) resolve();
          else reject(err ?? new Error("Audio failed to load."));
        };

        const timer = window.setTimeout(() => {
          finish(false, new Error("Audio took too long to load."));
        }, 20_000);

        const onMeta = () => {
          if (checkDuration()) finish(true);
        };

        const onCanPlay = () => {
          if (checkDuration()) {
            finish(true);
            return;
          }
          if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            finish(true);
          }
        };

        const onErr = () => {
          finish(false, new Error("Audio failed to load."));
        };

        audio.addEventListener("loadedmetadata", onMeta);
        audio.addEventListener("canplay", onCanPlay);
        audio.addEventListener("error", onErr);
      });

      setLoading(false);
      setSpeaking(true);
      try {
        await audio.play();
      } catch {
        failPlayback("Playback was blocked. Tap Read aloud again, or check browser autoplay settings.");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        cleanupPlayback();
        return;
      }
      if ((err as { name?: string }).name === "AbortError") {
        cleanupPlayback();
        return;
      }

      const msg =
        err instanceof Error
          ? err.message
          : "Read aloud failed. Check your connection and that the API server can reach Microsoft speech services.";

      const device = speakWithDevice(text, language, () => {
        setSpeaking(false);
        setFallbackHint(null);
      });
      if (device.ok) {
        setError(null);
        setFallbackHint(
          "Online Edge voices were unavailable, so this playback uses your device’s built-in speech instead."
        );
        setLoading(false);
        setSpeaking(true);
        return;
      }

      setError(`${msg} ${device.reason ? `(${device.reason})` : ""}`.trim());
      cleanupPlayback();
    }
  }

  function handleReadToggle() {
    if (speaking || loading) {
      stop();
      return;
    }
    void startReadAloud();
  }

  const busy = speaking || loading;

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleReadToggle}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-busy={busy}
        >
          <span className="material-symbols-outlined text-base" aria-hidden>
            {busy ? "stop_circle" : "volume_up"}
          </span>
          {loading ? "Loading…" : speaking ? "Stop" : "Read aloud"}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Read aloud uses Microsoft Edge online voices from your server when available; otherwise it can fall back to
          your device voice.
        </p>
      </div>

      {fallbackHint ? (
        <p
          className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs leading-6 text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-200"
          role="status"
        >
          {fallbackHint}
        </p>
      ) : null}

      {error ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="prose prose-slate max-w-none prose-headings:font-bold prose-p:leading-relaxed dark:prose-invert">
        <ChatMarkdown content={body} />
      </div>

      {keyPoints.length > 0 ? (
        <section aria-labelledby="key-points-heading">
          <h3 id="key-points-heading" className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
            Key points
          </h3>
          <ul className="m-0 list-none space-y-2 p-0">
            {keyPoints.map((point, index) => (
              <li
                key={index}
                className="flex gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-slate-700 dark:border-primary/20 dark:bg-primary/10 dark:text-slate-300"
              >
                <span className="material-symbols-outlined shrink-0 text-lg text-primary" aria-hidden>
                  check_circle
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
