"use client";

import { useMemo, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { useMessages, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Navbar } from "@/components/Navbar";
import { LandingCtaDocumentStillLife } from "@/components/landing/LandingCtaDocumentStillLife";
import { LandingHeroVideoBackdrop } from "@/components/landing/LandingHeroVideoBackdrop";
import { LandingWorkflowSection } from "@/components/landing/LandingWorkflowSection";
import type { LandingFeatureLane } from "@/components/landing/LandingFeatureGrid";
import { LandingFeatureGrid } from "@/components/landing/LandingFeatureGrid";

const LandingHeroScene = dynamic(
  () => import("@/components/landing/LandingHeroScene").then((module) => module.LandingHeroScene),
  { ssr: false }
);

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

type HeroMetric = { label: string; value: string };
type StatItem = { value: string; label: string };

export default function Home() {
  const heroRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const t = useTranslations("landingPage");
  const tRaw = useTranslations("landingPage");
  const tW = useTranslations("landingWorkflow");
  const messages = useMessages() as { landingFeature?: { lanes?: LandingFeatureLane[] } };

  const heroSignals = tRaw.raw("heroSignals") as string[];
  const heroMetrics = tRaw.raw("heroMetrics") as HeroMetric[];
  const statsItems = tRaw.raw("statsItems") as StatItem[];

  const workflowSteps = useMemo(
    () =>
      (["01", "02", "03"] as const).map((id) => ({
        id,
        title: tW(`steps.${id}.title`),
        description: tW(`steps.${id}.description`),
        outcome: tW(`steps.${id}.outcome`),
      })),
    [tW]
  );

  const productLanes = messages.landingFeature?.lanes ?? [];

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroTextY = useTransform(heroProgress, [0, 1], [0, reducedMotion ? 0 : -32]);
  const heroTextOpacity = useTransform(heroProgress, [0, 0.85, 1], [1, 0.98, 0.86]);
  const heroSceneY = useTransform(heroProgress, [0, 1], [0, reducedMotion ? 0 : 34]);
  const heroSceneRotate = useTransform(heroProgress, [0, 1], [0, reducedMotion ? 0 : -1.5]);
  const heroSceneScale = useTransform(heroProgress, [0, 1], [1, reducedMotion ? 1 : 1.01]);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fbff_42%,#f4f7fb_100%)] pt-16 text-slate-900 dark:bg-[radial-gradient(circle_at_top,#13203f_0%,#09101f_45%,#060b16_100%)] dark:text-white">
        <section
          ref={heroRef}
          className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-slate-200/60 dark:border-white/10"
        >
          <LandingHeroVideoBackdrop />

          <div className="absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-r from-white/96 via-white/78 to-transparent dark:from-slate-950/94 dark:via-slate-950/55 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/[0.06] via-transparent to-white/92 dark:from-slate-950/40 dark:via-transparent dark:to-slate-950/90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_78%_58%_at_88%_36%,rgba(49,94,251,0.12),transparent_60%)] dark:bg-[radial-gradient(ellipse_78%_58%_at_88%_36%,rgba(34,211,238,0.11),transparent_54%)]" />
            <div className="hero-grid absolute inset-0 opacity-[0.26] dark:opacity-[0.18]" />
          </div>

          <div className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-12 px-5 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(480px,1.12fr)] lg:items-start lg:px-8 lg:py-14 xl:gap-14 xl:px-10">
            <motion.div
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.12 }}
              style={{ y: heroTextY, opacity: heroTextOpacity }}
              className="max-w-xl lg:pb-6"
            >
              <motion.div
                variants={sectionReveal}
                className="mb-6 inline-flex items-center gap-3 rounded-full border border-slate-200/90 bg-white/90 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-slate-700 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/12 dark:bg-slate-950/45 dark:text-slate-100 dark:shadow-[0_16px_44px_rgba(2,6,23,0.4)]"
              >
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.75)]" />
                {t("heroBadge")}
              </motion.div>

              <motion.p
                variants={sectionReveal}
                className="mb-4 text-sm font-semibold uppercase tracking-[0.26em] text-slate-600 dark:text-slate-400"
              >
                {t("heroBrand")}
              </motion.p>

              <motion.h1
                variants={sectionReveal}
                className="font-hero-display max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.045em] sm:text-6xl lg:text-[4.45rem]"
              >
                {t("heroHeadline")}
              </motion.h1>

              <motion.p
                variants={sectionReveal}
                className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300"
              >
                {t("heroSubhead")}
              </motion.p>

              <motion.div variants={sectionReveal} className="mt-8 flex flex-wrap gap-3 sm:gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(15,23,42,0.2)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.26)] dark:bg-white dark:text-slate-950 dark:shadow-[0_14px_40px_rgba(255,255,255,0.12)] dark:hover:shadow-[0_18px_48px_rgba(255,255,255,0.18)]"
                >
                  {t("startFree")}
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300/90 bg-white/85 px-6 py-3 text-sm font-semibold text-slate-800 backdrop-blur-md transition-colors hover:border-slate-400 hover:text-slate-950 dark:border-white/18 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:border-white/35"
                >
                  {t("openDashboard")}
                </Link>
              </motion.div>

              <motion.ul
                variants={sectionReveal}
                className="mt-10 max-w-lg space-y-3 border-l border-slate-300/70 pl-5 dark:border-white/15"
              >
                {heroSignals.map((signal) => (
                  <li key={signal} className="flex gap-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[linear-gradient(135deg,#22d3ee_0%,#315efb_100%)]"
                      aria-hidden
                    />
                    {signal}
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: "easeOut", delay: 0.12 }}
              style={{ y: heroSceneY, rotate: heroSceneRotate, scale: heroSceneScale }}
              className="relative z-10 lg:mt-[5.75rem] lg:self-start lg:pl-4"
            >
              <div className="absolute -inset-8 rounded-[2.8rem] bg-[radial-gradient(circle,rgba(56,189,248,0.18),rgba(56,189,248,0)_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(56,189,248,0.14),rgba(56,189,248,0)_68%)]" />
              <div className="relative overflow-hidden rounded-[2.25rem] border border-white/80 bg-[linear-gradient(165deg,rgba(255,255,255,0.9),rgba(241,248,255,0.62))] shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/12 dark:bg-[linear-gradient(165deg,rgba(10,16,30,0.82),rgba(8,18,38,0.68))] dark:shadow-[0_32px_88px_rgba(2,6,23,0.55)]">
                <div className="relative min-h-[440px] overflow-hidden sm:min-h-[600px]">
                  <LandingHeroScene />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_38%,rgba(34,211,238,0.14),transparent_26%),radial-gradient(circle_at_22%_18%,rgba(49,94,251,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))] dark:bg-[radial-gradient(circle_at_62%_38%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_22%_18%,rgba(49,94,251,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />

                  <div className="absolute left-5 top-5 right-5 flex flex-wrap items-start justify-between gap-3 sm:left-6 sm:top-6 sm:right-6">
                    <div className="rounded-full border border-white/75 bg-white/78 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-700 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:shadow-[0_20px_50px_rgba(2,6,23,0.45)]">
                      {t("sceneTag1")}
                    </div>
                    <div className="rounded-full border border-emerald-400/30 bg-emerald-400/12 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-emerald-700 backdrop-blur-xl dark:text-emerald-200">
                      {t("sceneTag2")}
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6">
                    <div className="grid gap-5 rounded-[1.75rem] border border-white/70 bg-white/72 p-5 shadow-[0_24px_56px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/52 dark:shadow-[0_24px_60px_rgba(2,6,23,0.45)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-end">
                      <div>
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-200">
                          {t("sceneWorkspaceEyebrow")}
                        </p>
                        <h2 className="mt-3 max-w-lg text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
                          {t("sceneWorkspaceTitle")}
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {t("sceneWorkspaceBody")}
                        </p>
                      </div>

                      <div className="grid gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                        {heroMetrics.map((metric) => (
                          <div key={metric.label} className="grid gap-1">
                            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                              {metric.label}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <LandingWorkflowSection steps={workflowSteps} />
        <LandingFeatureGrid lanes={productLanes} />

        <section className="relative py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 xl:px-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="overflow-hidden rounded-[2.25rem] border border-slate-200/80 bg-slate-950 px-6 py-10 text-white shadow-[0_26px_70px_rgba(2,6,23,0.35)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b1222,#0e1d39)] sm:px-10"
            >
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">{t("statsEyebrow")}</p>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{t("statsTitle")}</h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">{t("statsBody")}</p>
                </div>

                <div className="grid gap-2 rounded-[1.6rem] border border-white/10 bg-white/6 p-3 sm:grid-cols-3 sm:gap-0">
                  {statsItems.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[1.2rem] px-4 py-5 sm:px-5 sm:py-6 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-white/10"
                    >
                      <p className="text-3xl font-black tracking-[-0.04em]">{stat.value}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative border-t border-slate-200/70 py-20 dark:border-white/10 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 xl:px-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative grid gap-10 rounded-[2.6rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(230,240,255,0.88))] px-8 py-12 shadow-[0_24px_70px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(12,18,34,0.96),rgba(14,33,68,0.96))] dark:shadow-[0_35px_90px_rgba(2,6,23,0.5)] sm:px-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),rgba(96,165,250,0))]" />

              <div className="relative max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary">{t("ctaEyebrow")}</p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl dark:text-white">
                  {t("ctaTitle")}
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{t("ctaBody")}</p>
              </div>

              <div className="relative flex flex-col gap-6 lg:items-end">
                <LandingCtaDocumentStillLife />
                <div className="flex w-full flex-col items-start gap-4 lg:items-end">
                  <p className="max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300 lg:text-right">
                    {t("ctaAside")}
                  </p>
                  <div className="flex flex-wrap gap-4 lg:justify-end">
                    <Link
                      href="/register"
                      className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(19,55,236,0.28)] transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      {t("createWorkspace")}
                    </Link>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center rounded-full border border-slate-300/80 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-950 hover:text-slate-950 dark:border-white/15 dark:text-slate-100 dark:hover:border-white/40"
                    >
                      {t("viewPricing")}
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70 py-10 text-center text-sm text-slate-500 backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
        <p>{t("footer")}</p>
      </footer>
    </>
  );
}
