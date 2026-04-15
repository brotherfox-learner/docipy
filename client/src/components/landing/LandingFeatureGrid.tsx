"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export type LandingFeatureLane = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
};

function FeatureLaneRow({
  lane,
  index,
}: {
  lane: LandingFeatureLane;
  index: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.04 }}
      className="grid gap-8 border-t border-slate-200/70 py-10 first:border-t-0 dark:border-white/10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-12 lg:py-14"
    >
      <div className={index % 2 === 1 ? "lg:order-2" : ""}>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
          {lane.eyebrow}
        </p>
        <h3 className="mt-4 max-w-xl text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
          {lane.title}
        </h3>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{lane.description}</p>
      </div>

      <div className={index % 2 === 1 ? "lg:order-1" : ""}>
        <div className="grid gap-4">
          {lane.points.map((point, pointIndex) => (
            <div
              key={point}
              className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-4 rounded-[1.35rem] border border-slate-200/75 bg-white/72 px-4 py-4 shadow-[0_14px_34px_rgba(148,163,184,0.1)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none"
            >
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#22d3ee_0%,#315efb_100%)] text-xs font-bold text-white">
                {pointIndex + 1}
              </span>
              <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export function LandingFeatureGrid({ lanes }: { lanes: LandingFeatureLane[] }) {
  const t = useTranslations("landingFeature");

  return (
    <section id="features" className="relative py-24 sm:py-28">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute right-[12%] top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.14),rgba(34,211,238,0))]" />
        <div className="absolute bottom-10 left-[10%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(49,94,251,0.12),rgba(49,94,251,0))]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 xl:px-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">{t("eyebrow")}</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl dark:text-white">
            {t("title")}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{t("subtitle")}</p>
        </motion.div>

        <div className="relative mt-14">
          {lanes.map((lane, index) => (
            <FeatureLaneRow key={lane.eyebrow} lane={lane} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
