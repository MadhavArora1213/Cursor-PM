"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, LayoutDashboard, Search, Users, Zap, Code, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const FloatingElement = ({ children, delay = 0, yOffset = 10, duration = 3 }: { children: React.ReactNode, delay?: number, yOffset?: number, duration?: number }) => (
  <motion.div
    animate={{ y: [0, yOffset, 0] }}
    transition={{ repeat: Infinity, duration, delay, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
)

export default function LandingPage() {
  const { user, openAuthModal, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      openAuthModal();
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 overflow-hidden font-sans">
      {/* Background elements - Premium glow and grain */}
      <div className="fixed inset-0 pointer-events-none w-full h-full">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/40 blur-[150px] rounded-full mix-blend-screen opacity-50" />
        <div className="absolute top-[10%] right-[-5%] w-[40%] h-[50%] bg-blue-900/40 blur-[150px] rounded-full mix-blend-screen opacity-40" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-pink-900/30 blur-[150px] rounded-full mix-blend-screen opacity-30" />
        <div className="absolute inset-0 z-[-1] opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Navigation - Glassmorphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05] bg-black/50 backdrop-blur-2xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Sparkles className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-purple-100 transition-colors">Cursor PM</span>
          </div>

          <div className="flex items-center gap-8 text-sm font-medium">
            <div className="hidden md:flex gap-8">
              {['Features', 'Integrations', 'Pricing', 'Docs'].map(item => (
                <Link key={item} href={`#${item.toLowerCase()}`} className="text-zinc-400 hover:text-white transition-colors relative group py-2">
                  {item}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all group-hover:w-full rounded-full" />
                </Link>
              ))}
            </div>

            {!loading && (
              <button
                onClick={handleGetStarted}
                className={cn(
                  "relative px-6 py-2.5 rounded-full font-medium transition-all group overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]",
                  user
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-white text-black hover:bg-zinc-200"
                )}
              >
                <span className="relative z-10">{user ? 'Dashboard' : 'Sign In'}</span>
                <div className="absolute inset-0 bg-white group-hover:scale-105 transition-transform duration-300" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 sm:pt-48 sm:pb-32 relative z-10 flex flex-col items-center flex-1 justify-center min-h-screen">
        <div className="max-w-7xl mx-auto text-center relative w-full">
          {/* Floating decorative elements */}
          <div className="absolute top-10 left-[10%] opacity-50 hidden lg:block">
            <FloatingElement yOffset={15} duration={4}>
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500/10 to-transparent border border-purple-500/20 backdrop-blur-md flex items-center justify-center rotate-12">
                <Search className="w-6 h-6 text-purple-400" />
              </div>
            </FloatingElement>
          </div>
          <div className="absolute top-20 right-[10%] opacity-50 hidden lg:block">
            <FloatingElement delay={1} yOffset={-20} duration={5}>
              <div className="w-20 h-20 rounded-full bg-linear-to-tr from-blue-500/10 to-transparent border border-blue-500/20 backdrop-blur-md flex items-center justify-center -rotate-12">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
            </FloatingElement>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm font-medium text-zinc-300 mb-10 hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
            </span>
            <span className="group-hover:text-white transition-colors">Introducing Cursor PM 2.0</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter mb-8 drop-shadow-2xl"
            style={{ lineHeight: 1.1 }}
          >
            Design your product.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-500 pb-2 inline-block">
              Shape the future.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="max-w-2xl mx-auto text-xl text-zinc-400 mb-12 leading-relaxed font-medium"
          >
            The intelligent workspace for ambitious product teams. From user research to shipping, execute brilliant ideas flawlessly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <button
              onClick={handleGetStarted}
              className="relative w-full sm:w-auto px-8 py-4 rounded-full text-black font-bold text-lg overflow-hidden group shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all bg-white"
            >
              <span className="absolute inset-0 bg-white transition-transform duration-300 group-hover:scale-105" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                Start Building Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button
              className="w-full sm:w-auto px-8 py-4 rounded-full text-white font-semibold text-lg bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all flex items-center justify-center gap-2 hover:border-white/20"
            >
              <Code className="w-5 h-5" /> View Documentation
            </button>
          </motion.div>

          {/* Premium Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            className="mt-24 relative mx-auto max-w-6xl group perspective-[2000px]"
          >
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-[#050505] to-transparent z-20 pointer-events-none" />

            {/* Outer Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

            <div className="rounded-3xl border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-2xl overflow-hidden shadow-2xl relative transition-all duration-700 ease-out transform-gpu rotate-x-[15deg] group-hover:rotate-x-[0deg] hover:scale-[1.02] shadow-[0_30px_60px_animate-pulse_rgba(0,0,0,0.5)]">
              {/* App Window Header */}
              <div className="flex gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)] hover:bg-red-500 transition-colors" />
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.5)] hover:bg-yellow-500 transition-colors" />
                <div className="w-3.5 h-3.5 rounded-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.5)] hover:bg-green-500 transition-colors" />
              </div>
              <div className="mx-auto flex items-center gap-2 bg-[#1A1A1A] rounded-lg px-3 py-1.5 border border-white/5 shadow-inner text-xs font-mono text-zinc-400">
                <Shield className="w-3 h-3 text-green-400" /> project.cursor.pm
              </div>
            </div>

            {/* App Content */}
            <div className="p-8 pt-24 grid grid-cols-12 gap-8 h-[600px] opacity-90 pb-32">
              {/* Sidebar */}
              <div className="col-span-3 hidden md:flex flex-col gap-6 border-r border-white/5 pr-8">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">Workspace</div>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                      <LayoutDashboard className="w-3 h-3 text-white" />
                    </div>
                    <div className="w-24 h-2.5 bg-purple-200/80 rounded" />
                  </div>
                  {[Users, Search, Zap].map((Icon, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                      <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                        <Icon className="w-3 h-3 text-zinc-400" />
                      </div>
                      <div className={`h-2 bg-zinc-600 rounded ${idx === 0 ? 'w-20' : idx === 1 ? 'w-28' : 'w-16'}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-auto p-4 rounded-xl bg-linear-to-br from-white/5 to-transparent border border-white/10">
                  <div className="w-full h-2 bg-white/10 rounded overflow-hidden mb-2">
                    <div className="w-[60%] h-full bg-linear-to-r from-blue-400 to-purple-500" />
                  </div>
                  <div className="w-16 h-1.5 bg-zinc-600 rounded" />
                </div>
              </div>

              {/* Main Area */}
              <div className="col-span-12 md:col-span-9 flex flex-col gap-8">
                <div className="flex justify-between items-center">
                  <div className="w-64 h-8 bg-gradient-to-r from-white/20 to-transparent rounded-lg" />
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20" />
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 -ml-4" />
                    <div className="w-8 h-8 rounded-full bg-purple-500 border border-purple-400/50 -ml-4" />
                  </div>
                </div>

                {/* Bento Grid layout */}
                <div className="grid grid-cols-3 grid-rows-2 gap-4 h-full">
                  <div className="col-span-2 row-span-1 bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                    <div className="w-1/3 h-4 bg-white/20 rounded mb-6" />
                    <div className="w-full h-[60%] bg-linear-to-t from-purple-500/10 to-transparent border-t border-purple-500/20 mt-auto rounded-t-lg absolute bottom-0 inset-x-0" />
                    <svg className="absolute bottom-0 w-full h-24 opacity-50" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path d="M0 100 C 20 0 50 100 80 20 L 100 100 Z" fill="none" stroke="rgba(168,85,247,0.5)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      <path d="M0 100 C 30 50 40 80 90 40 L 100 100 Z" fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>

                  <div className="col-span-1 row-span-1 bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 flex flex-col">
                    <div className="w-1/2 h-4 bg-white/20 rounded mb-4" />
                    <div className="flex-1 flex items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full border-4 border-white/10" />
                        <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-purple-500 border-r-blue-500 absolute rotate-45" />
                        <div className="text-xl font-bold">85%</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 row-span-1 bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 flex flex-col">
                    <div className="w-1/4 h-4 bg-white/20 rounded mb-6" />
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-white/20" />
                          </div>
                          <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: `${80 - i * 15}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Premium Features Bento Grid */}
      <section id="features" className="py-32 px-6 relative z-10 bg-black">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:3rem_3rem]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[200px] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm font-semibold text-purple-300 mb-6 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:bg-white/10 transition-colors"
            >
              Features tailored for PMs
            </motion.div>
            <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white drop-shadow-xl">
              Everything <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500">connects.</span>
            </h2>
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
              A completely unified experience. Say goodbye to tab switching and scattered docs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 auto-rows-[300px]">
            {/* Featured Large Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="md:col-span-2 md:row-span-1 p-8 sm:p-10 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-black relative overflow-hidden group hover:border-white/20 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full group-hover:bg-purple-500/30 transition-colors duration-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <Zap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-3 text-white">AI-Powered PRDs</h3>
                  <p className="text-zinc-400 text-lg leading-relaxed max-w-md font-medium group-hover:text-zinc-300 transition-colors">
                    Generate comprehensive product requirement documents in seconds based on brief outlines or user feedback.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Feature Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-1 md:row-span-1 p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-black relative overflow-hidden group hover:border-white/20 transition-all duration-500"
            >
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 blur-[80px] rounded-full group-hover:bg-blue-500/30 transition-colors duration-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none delay-100" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <Search className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-white">Smart Research</h3>
                  <p className="text-zinc-400 font-medium group-hover:text-zinc-300 transition-colors">Instantly surface insights from past user interviews and analytics data.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-1 md:row-span-1 p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-black relative overflow-hidden group hover:border-white/20 transition-all duration-500"
            >
              <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-pink-500/10 blur-[80px] rounded-full group-hover:bg-pink-500/30 transition-colors duration-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none delay-200" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-pink-400 mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(236,72,153,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <LayoutDashboard className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-white">Infinite Canvas</h3>
                  <p className="text-zinc-400 font-medium group-hover:text-zinc-300 transition-colors">Map complex user flows and link designs directly to engineering tickets.</p>
                </div>
              </div>
            </motion.div>

            {/* Featured Large Card 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="md:col-span-2 md:row-span-1 p-8 sm:p-10 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-black relative overflow-hidden group hover:border-white/20 transition-all duration-500"
            >
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/30 transition-colors duration-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none delay-300" />
              <div className="relative z-10 flex flex-col justify-between h-full hover:px-2 transition-all duration-500">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-3 text-white">Sync with Engineering</h3>
                  <p className="text-zinc-400 text-lg leading-relaxed max-w-md font-medium group-hover:text-zinc-300 transition-colors">
                    Bidirectional sync with Linear, Jira, and GitHub. When engineering moves, your roadmap updates instantly.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
