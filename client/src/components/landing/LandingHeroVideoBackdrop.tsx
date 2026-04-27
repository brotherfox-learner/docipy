"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/media/hero-background.mp4";

export function LandingHeroVideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const ok = !mq.matches;
      setMotionOk(ok);
      if (!ok && videoRef.current) {
        videoRef.current.pause();
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!motionOk) return;
    const el = videoRef.current;
    if (!el) return;
    const run = () => {
      void el.play().catch(() => {});
    };
    run();
    el.addEventListener("canplay", run);
    return () => el.removeEventListener("canplay", run);
  }, [motionOk]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {motionOk ? (
        <video
          ref={videoRef}
          className="landing-hero-video h-full min-h-full w-full min-w-full object-cover object-center dark:brightness-[0.78] dark:saturate-[0.9]"
          src={VIDEO_SRC}
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="h-full w-full bg-[radial-gradient(ellipse_120%_90%_at_50%_18%,#1d4e7a_0%,#0f172a_42%,#020617_100%)] dark:bg-[radial-gradient(ellipse_120%_90%_at_50%_18%,#0c4a6e_0%,#020617_48%,#000_100%)]" />
      )}
    </div>
  );
}
