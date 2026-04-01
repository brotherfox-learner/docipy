"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <>
      <Navbar />
      <main className="pt-16 overflow-hidden">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-10 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="flex flex-col gap-8 text-left"
              >
                <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase w-fit">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  New: Knowledge Graph v2.0
                </motion.div>
                <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                  Turn documents into <span className="text-primary relative inline-block">
                    <span className="relative z-10">structured knowledge</span>
                    <svg className="absolute w-full h-3 -bottom-3 left-0 text-primary/30 z-0 " viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" /></svg>
                  </span> 
                  <div className="mt-3">with AI</div>
                </motion.h1>
                <motion.p variants={itemVariants} className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-xl">
                  Upload any PDF, doc, or link and let our AI transform your messy files into organized, searchable, and interactive knowledge bases instantly.
                </motion.p>
                <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
                  <Link href="/register">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-xl shadow-primary/30 flex items-center gap-2 group"
                    >
                      Start Free <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </motion.button>
                  </Link>
                  <Link href="#features">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      View Demo
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative group perspective-1000"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <motion.div
                  whileHover={{ rotateY: 5, rotateX: 5 }}
                  className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden aspect-video flex items-center justify-center transform-gpu transition-all duration-300"
                >
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>

                    {/* Mockup UI Inside */}
                    <div className="w-[80%] h-[70%] bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 relative z-10 flex flex-col">
                      <div className="flex gap-2 mb-4 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="space-y-3 flex-1">
                        <motion.div initial={{ width: "0%" }} animate={{ width: "75%" }} transition={{ duration: 1, delay: 0.5 }} className="h-4 bg-slate-200 dark:bg-slate-800 rounded"></motion.div>
                        <motion.div initial={{ width: "0%" }} animate={{ width: "50%" }} transition={{ duration: 1, delay: 0.7 }} className="h-4 bg-slate-200 dark:bg-slate-800 rounded"></motion.div>
                        <div className="grid grid-cols-3 gap-4 mt-6">
                          {[0, 1, 2].map((i) => (
                            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 + (i * 0.2), type: "spring" }} className="h-20 bg-primary/5 rounded border border-primary/10 flex items-center justify-center text-primary/20">
                              <span className="material-symbols-outlined text-3xl">data_exploration</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-10 -right-10 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white dark:bg-slate-900/50" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col gap-4">
              <h2 className="text-primary font-bold tracking-widest uppercase text-sm">Capabilities</h2>
              <h3 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">Everything you need to master your data</h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg">Our suite of AI tools helps you learn faster and organize better by turning raw data into meaningful insights.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: "description", title: "AI Summary", desc: "Instant high-level overviews of any lengthy document. Get the gist in seconds." },
                { icon: "quiz", title: "Quiz Generator", desc: "Generate practice tests automatically to verify your knowledge." },
                { icon: "style", title: "Flashcards", desc: "Smart spaced-repetition cards created from your content." },
                { icon: "forum", title: "Chat with Document", desc: "Ask questions and get cited answers directly from your files." },
                { icon: "account_tree", title: "Knowledge Graph", desc: "Visualize connections between concepts across multiple documents." },
                { icon: "bolt", title: "Instant OCR", desc: "Our high-fidelity OCR makes even handwriting searchable." }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-background-light dark:bg-slate-900 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
                  </div>
                  <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                  <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-primary rounded-3xl p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl shadow-primary/30"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-8">
                <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight">Ready to master your knowledge?</h2>
                <p className="text-blue-100 text-lg">Join thousands of researchers, students, and professionals who have upgraded their workflow.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/register">
                    <motion.button whileHover={{ scale: 1.05 }} className="px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-xl">
                      Start Free Now
                    </motion.button>
                  </Link>
                </div>
              </div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: "1s" }}></div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>© 2026 Nitithon T. Dev. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
