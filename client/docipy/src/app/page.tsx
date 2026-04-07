"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const heroSignals = [
  "OCR + semantic extraction",
  "Instant summaries and flashcards",
  "Cited answers from your documents",
];

const workflowSteps = [
  {
    id: "01",
    title: "Drop in any source",
    description:
      "Upload PDFs, DOCX files, lecture notes, or links and let Docipy normalize messy inputs automatically.",
  },
  {
    id: "02",
    title: "Watch AI map the meaning",
    description:
      "The engine extracts concepts, connects related ideas, and builds a searchable layer of knowledge over every page.",
  },
  {
    id: "03",
    title: "Study, search, and decide faster",
    description:
      "Move from static documents to summaries, quizzes, flashcards, and document chat without switching tools.",
  },
];

const productLanes = [
  {
    eyebrow: "Summaries",
    title: "See the whole document before you read every page.",
    description:
      "High-signal overviews pull out key themes, action items, and terms so you can orient in seconds.",
    points: ["Executive recap", "Concept highlights", "Readable on mobile"],
  },
  {
    eyebrow: "Interactive search",
    title: "Ask questions and get answers grounded in your files.",
    description:
      "Chat with one document or across a collection, then jump from answer to source material with clear context.",
    points: ["Context-aware chat", "Cited responses", "Cross-document reasoning"],
  },
  {
    eyebrow: "Knowledge graph",
    title: "Turn disconnected paragraphs into a connected system.",
    description:
      "Visual relationships reveal clusters, repeated themes, and hidden dependencies that normal reading misses.",
    points: ["Topic mapping", "Relationship discovery", "Fast visual scanning"],
  },
];

const stats = [
  { value: "< 60s", label: "from upload to useful output" },
  { value: "4 modes", label: "summary, quiz, flashcards, chat" },
  { value: "1 workspace", label: "for reading, studying, and retrieval" },
];

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fbff_42%,#f4f7fb_100%)] pt-16 text-slate-900 dark:bg-[radial-gradient(circle_at_top,#13203f_0%,#09101f_45%,#060b16_100%)] dark:text-white">
        <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-[-12rem] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(77,118,255,0.32),rgba(77,118,255,0))]" />
            <div className="absolute right-[-8rem] top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(64,224,208,0.26),rgba(64,224,208,0))]" />
            <div className="absolute bottom-[-10rem] left-[-8rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(22,163,255,0.18),rgba(22,163,255,0))]" />
            <div className="hero-grid absolute inset-0 opacity-50 dark:opacity-60" />
          </div>

          <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-14 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(480px,0.95fr)] lg:px-8 lg:py-16">
            <motion.div
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.12 }}
              className="max-w-2xl"
            >
              <motion.div
                variants={sectionReveal}
                className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-700 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:shadow-[0_20px_50px_rgba(2,6,23,0.45)]"
              >
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
                AI document intelligence
              </motion.div>

              <motion.p
                variants={sectionReveal}
                className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400"
              >
                Docipy
              </motion.p>

              <motion.h1
                variants={sectionReveal}
                className="max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.05em] sm:text-6xl lg:text-7xl"
              >
                Build a living knowledge layer over every document you own.
              </motion.h1>

              <motion.p
                variants={sectionReveal}
                className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300"
              >
                Stop reading static files in isolation. Docipy turns PDFs, notes,
                and links into searchable structure, guided study tools, and
                answers you can actually use.
              </motion.p>

              <motion.div
                variants={sectionReveal}
                className="mt-8 flex flex-wrap gap-4"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition-transform duration-300 hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                >
                  Start free
                  <span className="material-symbols-outlined text-base">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-slate-400 hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/30"
                >
                  Open dashboard
                </Link>
              </motion.div>

              <motion.div
                variants={sectionReveal}
                className="mt-10 flex flex-wrap gap-3"
              >
                {heroSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-[0_12px_30px_rgba(148,163,184,0.12)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:shadow-none"
                  >
                    {signal}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: "easeOut", delay: 0.12 }}
              className="relative"
            >
              <div className="absolute -inset-8 rounded-[2.5rem] bg-[radial-gradient(circle,rgba(56,189,248,0.2),rgba(56,189,248,0)_68%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_35px_90px_rgba(2,6,23,0.65)]">
                <div className="mb-4 flex items-center justify-between rounded-[1.5rem] border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Neural workspace
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em]">
                      Document intelligence stream
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                    Live processing
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
                  <div className="overflow-hidden rounded-[1.6rem] border border-slate-200/70 bg-[linear-gradient(160deg,rgba(247,250,255,0.96),rgba(231,240,255,0.85))] p-5 dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.95),rgba(14,30,58,0.92))]">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                          Active file
                        </p>
                        <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                          AI Research Pack.pdf
                        </h2>
                      </div>
                      <div className="flex gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-400" />
                        <span className="h-3 w-3 rounded-full bg-amber-400" />
                        <span className="h-3 w-3 rounded-full bg-emerald-400" />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          label: "Summary",
                          value: "12 key points",
                        },
                        {
                          label: "Graph",
                          value: "48 linked concepts",
                        },
                        {
                          label: "Quiz",
                          value: "20 generated prompts",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-white/70 bg-white/85 p-4 dark:border-white/10 dark:bg-white/5"
                        >
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                            {item.label}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-[1.6rem] border border-slate-200/70 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-950/75">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            Semantic map
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Related ideas are clustered automatically.
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">
                          hub
                        </span>
                      </div>
                      <div className="relative mt-6 h-52 overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(84,130,255,0.18),transparent_40%),linear-gradient(180deg,rgba(248,250,252,1),rgba(238,244,255,1))] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(84,130,255,0.24),transparent_35%),linear-gradient(180deg,rgba(3,7,18,1),rgba(7,16,34,1))]">
                        <motion.div
                          animate={{ opacity: [0.25, 0.55, 0.25] }}
                          transition={{ repeat: Infinity, duration: 3.4 }}
                          className="absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl"
                        />
                        {[
                          "Methods",
                          "Signals",
                          "Claims",
                          "Metrics",
                          "Bias",
                          "Findings",
                        ].map((node, index) => {
                          const positions = [
                            "left-[12%] top-[28%]",
                            "left-[36%] top-[16%]",
                            "right-[14%] top-[28%]",
                            "left-[22%] bottom-[20%]",
                            "left-[50%] bottom-[10%]",
                            "right-[10%] bottom-[24%]",
                          ];

                          return (
                            <motion.div
                              key={node}
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5 + index * 0.12 }}
                              className={`absolute ${positions[index]} rounded-full border border-slate-300/70 bg-white/85 px-3 py-1 text-xs font-medium text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:shadow-none`}
                            >
                              {node}
                            </motion.div>
                          );
                        })}
                        <svg
                          className="absolute inset-0 h-full w-full"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          <path
                            d="M22 34 C36 22, 46 20, 57 30"
                            stroke="rgba(96,165,250,0.55)"
                            strokeWidth="0.7"
                            fill="none"
                          />
                          <path
                            d="M57 30 C68 34, 72 44, 78 62"
                            stroke="rgba(34,211,238,0.45)"
                            strokeWidth="0.7"
                            fill="none"
                          />
                          <path
                            d="M22 34 C28 54, 38 64, 50 76"
                            stroke="rgba(59,130,246,0.35)"
                            strokeWidth="0.7"
                            fill="none"
                          />
                          <path
                            d="M38 18 C44 34, 46 48, 50 76"
                            stroke="rgba(148,163,184,0.35)"
                            strokeWidth="0.7"
                            fill="none"
                          />
                          <path
                            d="M50 76 C64 68, 72 60, 84 40"
                            stroke="rgba(56,189,248,0.45)"
                            strokeWidth="0.7"
                            fill="none"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-[1.6rem] border border-slate-200/70 bg-white/85 p-5 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                            Query engine
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                            Ask anything about the file
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-cyan-500">
                          auto_awesome
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white dark:bg-slate-900">
                          What changed between section 2 and section 4?
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                          Section 4 reframes the earlier claim with stronger
                          evidence and adds a measurable benchmark.
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,247,255,0.92))] p-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                        Study output
                      </p>
                      <div className="mt-4 space-y-3">
                        {[
                          "Flashcards generated",
                          "Quiz ready",
                          "Key definitions extracted",
                        ].map((line, index) => (
                          <motion.div
                            key={line}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + index * 0.12 }}
                            className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {line}
                            </span>
                            <span className="material-symbols-outlined text-emerald-500">
                              check_circle
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="relative border-y border-slate-200/70 bg-white/70 py-20 backdrop-blur dark:border-white/10 dark:bg-white/3"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ staggerChildren: 0.12 }}
              className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]"
            >
              <div>
                <motion.p
                  variants={sectionReveal}
                  className="text-sm font-semibold uppercase tracking-[0.3em] text-primary"
                >
                  Workflow
                </motion.p>
                <motion.h2
                  variants={sectionReveal}
                  className="mt-4 max-w-lg text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl dark:text-white"
                >
                  Built for the moment a document becomes work.
                </motion.h2>
                <motion.p
                  variants={sectionReveal}
                  className="mt-5 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300"
                >
                  The page is not the product. The output is. Docipy is designed
                  to collapse the gap between upload, understanding, and action.
                </motion.p>
              </div>

              <div className="grid gap-6">
                {workflowSteps.map((step) => (
                  <motion.div
                    key={step.id}
                    variants={sectionReveal}
                    className="grid gap-5 border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-white/10 sm:grid-cols-[100px_1fr]"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
                      {step.id}
                    </p>
                    <div>
                      <h3 className="text-2xl font-bold tracking-[-0.03em] text-slate-950 dark:text-white">
                        {step.title}
                      </h3>
                      <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="relative py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ staggerChildren: 0.12 }}
              className="max-w-3xl"
            >
              <motion.p
                variants={sectionReveal}
                className="text-sm font-semibold uppercase tracking-[0.3em] text-primary"
              >
                Product depth
              </motion.p>
              <motion.h2
                variants={sectionReveal}
                className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl dark:text-white"
              >
                One system for retrieval, study, and insight.
              </motion.h2>
            </motion.div>

            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {productLanes.map((lane, index) => (
                <motion.article
                  key={lane.eyebrow}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="flex h-full flex-col rounded-[2rem] border border-slate-200/80 bg-white/72 p-8 shadow-[0_20px_55px_rgba(148,163,184,0.12)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
                    {lane.eyebrow}
                  </p>
                  <h3 className="mt-5 text-2xl font-bold tracking-[-0.03em] text-slate-950 dark:text-white">
                    {lane.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
                    {lane.description}
                  </p>
                  <div className="mt-8 space-y-3">
                    {lane.points.map((point) => (
                      <div
                        key={point}
                        className="flex items-center gap-3 border-t border-slate-200/80 pt-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300"
                      >
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        {point}
                      </div>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              className="overflow-hidden rounded-[2.25rem] border border-slate-200/80 bg-slate-950 px-6 py-10 text-white shadow-[0_26px_70px_rgba(2,6,23,0.35)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b1222,#0e1d39)] sm:px-10"
            >
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
                    Fast value
                  </p>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                    The fastest path from raw file to usable knowledge.
                  </h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5"
                    >
                      <p className="text-3xl font-black tracking-[-0.04em]">
                        {stat.value}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative overflow-hidden rounded-[2.6rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(230,240,255,0.88))] px-8 py-14 text-center shadow-[0_24px_70px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(12,18,34,0.96),rgba(14,33,68,0.96))] dark:shadow-[0_35px_90px_rgba(2,6,23,0.5)] sm:px-14"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),rgba(96,165,250,0))]" />
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary">
                  Start now
                </p>
                <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl dark:text-white">
                  Make your documents feel like a product, not a pile.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Upload once, then search, learn, and revisit with structure.
                  Docipy helps students, researchers, and teams move faster from
                  information to clarity.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(19,55,236,0.28)] transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    Create your workspace
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center rounded-full border border-slate-300/80 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-950 hover:text-slate-950 dark:border-white/15 dark:text-slate-100 dark:hover:border-white/40"
                  >
                    View pricing
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70 py-10 text-center text-sm text-slate-500 backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
        <p>© 2026 Docipy. Structured knowledge for every document.</p>
      </footer>
    </>
  );
}
