"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export type LandingWorkflowStep = {
  id: string;
  title: string;
  description: string;
  outcome: string;
};

function WorkflowStepRow({ step }: { step: LandingWorkflowStep }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="grid gap-5 border-b border-slate-200/70 py-8 last:border-b-0 dark:border-white/10 md:grid-cols-[84px_minmax(0,1fr)_240px] md:gap-8 md:py-10"
    >
      <p className="pt-1 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-cyan-600 dark:text-cyan-300">
        {step.id}
      </p>
      <div className="max-w-2xl">
        <h3 className="text-2xl font-black tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[2rem]">
          {step.title}
        </h3>
        <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">{step.description}</p>
      </div>
      <p className="max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-400">{step.outcome}</p>
    </motion.article>
  );
}

export function LandingWorkflowSection({ steps }: { steps: LandingWorkflowStep[] }) {
  const t = useTranslations("landingWorkflow");

  return (
    <section
      id="how-it-works"
      className="relative border-y border-slate-200/70 bg-white/64 py-24 backdrop-blur dark:border-white/10 dark:bg-white/3 sm:py-28"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.14),rgba(34,211,238,0))]" />
        <div className="absolute bottom-0 right-[10%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(49,94,251,0.12),rgba(49,94,251,0))]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="max-w-xl"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">{t("eyebrow")}</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl dark:text-white">
              {t("title")}
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300">{t("subtitle")}</p>
          </motion.div>

          <div className="border-y border-slate-200/70 dark:border-white/10">
            {steps.map((step) => (
              <WorkflowStepRow key={step.id} step={step} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
