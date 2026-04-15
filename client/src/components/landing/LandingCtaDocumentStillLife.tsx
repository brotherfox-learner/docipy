"use client";

import { motion } from "framer-motion";

const sheetVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0, 0, 0.2, 1] as const, delay },
  }),
};

function DocumentSheet({
  className,
  delay,
  accentClassName,
}: {
  className: string;
  delay: number;
  accentClassName: string;
}) {
  return (
    <motion.div
      custom={delay}
      variants={sheetVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      className={`absolute rounded-[1.7rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] p-4 shadow-[0_30px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl ${className}`}
    >
      <div className={`h-3 w-24 rounded-full ${accentClassName}`} />
      <div className="mt-5 space-y-3">
        <div className="h-2.5 w-full rounded-full bg-white/35" />
        <div className="h-2.5 w-4/5 rounded-full bg-white/20" />
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-3 pt-2">
          <div className="h-16 rounded-[1.1rem] border border-white/10 bg-white/10" />
          <div className="space-y-3">
            <div className="h-7 rounded-2xl bg-white/14" />
            <div className="h-6 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingCtaDocumentStillLife() {
  return (
    <div className="relative hidden h-[260px] w-full max-w-[430px] lg:block" aria-hidden>
      <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_35%_25%,rgba(96,165,250,0.35),rgba(96,165,250,0)_45%),radial-gradient(circle_at_72%_70%,rgba(34,211,238,0.24),rgba(34,211,238,0)_38%)]" />
      <div className="absolute left-10 top-7 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-3 right-12 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />

      <DocumentSheet
        delay={0.08}
        accentClassName="bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(96,165,250,0.9))]"
        className="left-2 top-12 h-[178px] w-[230px] -rotate-[15deg]"
      />
      <DocumentSheet
        delay={0.16}
        accentClassName="bg-[linear-gradient(90deg,rgba(99,102,241,0.95),rgba(59,130,246,0.9))]"
        className="left-24 top-0 z-10 h-[198px] w-[246px] rotate-[9deg]"
      />
      <DocumentSheet
        delay={0.24}
        accentClassName="bg-[linear-gradient(90deg,rgba(74,222,128,0.92),rgba(45,212,191,0.88))]"
        className="right-2 top-16 z-20 h-[182px] w-[224px] rotate-[18deg]"
      />

    </div>
  );
}
