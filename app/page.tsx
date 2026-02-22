"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Command, ChevronRight, MessageSquare, Briefcase,
  Github, Twitter, Zap, Sparkles, Workflow, Mic, Cpu,
  Database, Layout, ArrowRight, GitBranch, Terminal,
  Moon, Sun, Shield, Lock, CheckCircle2, Server,
  Code2, Users, LineChart, MoveRight, Layers, Box, Globe,
  Activity, ArrowUpRight, Plus, Rocket
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { user, openAuthModal, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-500 overflow-x-hidden">

      <header className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 max-w-[1000px] w-[calc(100%-2rem)]",
        scrolled
          ? "bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-full py-3 px-4"
          : "bg-white/50 dark:bg-black/50 backdrop-blur-xl border border-zinc-200/50 dark:border-white/5 rounded-full py-4 px-6 shadow-sm"
      )}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Command className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">Cursor PM</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 p-1.5 rounded-full border border-zinc-200/80 dark:border-white/5">
            {['Product', 'Enterprise', 'Pricing', 'Docs'].map((item, i) => (
              <button key={item} className={cn(
                "px-5 py-2 rounded-full text-sm font-semibold transition-all",
                i === 0
                  ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-white/10"
                  : "text-zinc-500 hover:text-black hover:bg-zinc-200/50 dark:hover:text-white dark:hover:bg-zinc-800/50"
              )}>
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!loading && (
              <>
                <button onClick={openAuthModal} className="hidden sm:block px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors">
                  Sign in
                </button>
                <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></div>
                <button onClick={handleGetStarted} className="px-6 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-bold shadow-lg shadow-black/20 dark:shadow-white/20 hover:scale-105 active:scale-95 transition-all">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full flex flex-col items-center">

        {/* Section 1: Minimalist Structured Hero */}
        <section className="relative w-full pt-32 lg:pt-48 px-6 flex flex-col items-center text-center max-w-[1400px] mx-auto z-10">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Cursor PM v3.0: Local Vectors and Jira Sync are Live</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-6xl sm:text-7xl lg:text-[6rem] font-bold tracking-tighter text-black dark:text-white mb-8 leading-[1.05] max-w-5xl"
          >
            Design product reality.<br />
            Outsource <span className="text-zinc-400 dark:text-zinc-500">the execution.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mb-10 font-medium leading-relaxed"
          >
            The premium workspace for ambitious product teams. Natively connect spatial canvas reasoning directly to structured engineering outputs using completely localized AI.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <button onClick={handleGetStarted} className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold shadow-xl hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2">
              Initialize Workspace
            </button>
            <button className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-white dark:bg-[#111] border border-zinc-200 dark:border-white/10 text-black dark:text-white font-semibold hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2 shadow-sm">
              <Terminal className="w-4 h-4 text-zinc-500" /> Read the Documentation
            </button>
          </motion.div>

        </section>

        {/* Section 2: Split-Pane High Fidelity Mockup */}
        <section className="w-full px-4 sm:px-6 max-w-[1200px] mx-auto mt-20 lg:mt-32 mb-40 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }}
            className="relative rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-[#111111]/50 backdrop-blur-2xl shadow-2xl dark:shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* macOS Window Header */}
            <div className="h-14 border-b border-zinc-200 dark:border-white/10 flex items-center px-6 bg-zinc-50 dark:bg-zinc-950/80 backdrop-blur-md">
              <div className="flex gap-2 relative z-10">
                <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-red-400 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-yellow-400 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-green-400 transition-colors cursor-pointer" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-white dark:bg-black border border-zinc-200 dark:border-white/10 text-[10px] font-semibold text-zinc-500 shadow-sm">
                  <Lock className="w-3 h-3 text-zinc-400" /> workspace / app.cursor.pm
                </div>
              </div>
            </div>

            {/* Application Layout */}
            <div className="flex flex-col md:flex-row h-[500px] md:h-[700px] bg-zinc-50 dark:bg-[#0A0A0A]">

              {/* Sidebar */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-white/10 bg-white/40 dark:bg-[#050505]/40 flex flex-col">
                <div className="p-6 border-b border-zinc-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-black dark:text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-black dark:text-white">Q3 Product Scope</div>
                      <div className="text-[10px] text-zinc-500 font-medium">Core Platform</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-1">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-2 pt-2">Models</div>
                  {[
                    { icon: Workflow, text: "Canvas Graph", active: true },
                    { icon: Database, text: "Vector DB", active: false },
                    { icon: Mic, text: "Audio Intake", active: false },
                    { icon: Code2, text: "API Contracts", active: false },
                  ].map((item, i) => (
                    <div key={i} className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors", item.active ? "bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50")}>
                      <item.icon className={cn("w-4 h-4", item.active && "text-blue-500")} /> {item.text}
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-zinc-200 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Llama-3 Active
                  </div>
                </div>
              </div>

              {/* Main Canvas Area */}
              <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#0A0A0A]">
                {/* Dot Grid Background */}
                <div className="absolute inset-0 bg-size-[24px_24px] bg-[radial-gradient(circle_at_center,#00000010_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(circle_at_center,#ffffff10_1.5px,transparent_1.5px)]" />

                <div className="absolute inset-0 p-8 md:p-12 relative z-10 flex flex-col justify-center">

                  {/* Node 1 */}
                  <div className="w-72 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-5 mb-16 transform md:translate-x-12 relative group cursor-pointer hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors">
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-[#111] shadow-sm z-20" />
                    <div className="flex items-center gap-2 mb-3">
                      <Mic className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">User Interview</span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">"Users are complaining about the slow export times when rendering heavy logic graphs."</p>
                  </div>

                  {/* Node 2 */}
                  <div className="w-80 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-6 transform md:translate-x-40 relative group cursor-pointer hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-colors">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-[#111] shadow-sm z-20" />
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 border-2 border-white dark:border-[#111] shadow-sm z-20" />
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Algorithmic Resolution</span>
                      </div>
                      <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded font-bold">P0</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
                      <div className="h-2 w-5/6 bg-zinc-100 dark:bg-zinc-800 rounded" />
                      <div className="h-2 w-4/6 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    </div>
                  </div>

                  {/* SVG Connecting lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block z-0">
                    <path d="M 345 235 C 400 235, 300 375, 410 375" fill="transparent" stroke="url(#curveGrad)" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                    <defs>
                      <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

            </div>
          </motion.div>
        </section>

        {/* Section 3: Logos Cloud */}
        <section className="w-full border-t border-b border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#0A0A0A] py-16">
          <div className="max-w-[1400px] mx-auto px-6 text-center">
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-10">Powering high-velocity product teams</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2 text-xl font-black text-black dark:text-white"><Globe className="w-6 h-6" /> Vercel</div>
              <div className="flex items-center gap-2 text-xl font-bold text-black dark:text-white"><Layers className="w-6 h-6" /> Linear</div>
              <div className="flex items-center gap-2 text-xl font-bold text-black dark:text-white"><Box className="w-6 h-6" /> Stripe</div>
              <div className="flex items-center gap-2 text-xl font-bold text-black dark:text-white"><Activity className="w-6 h-6" /> Ramp</div>
            </div>
          </div>
        </section>

        {/* Section 4: Metrics / The Problem */}
        <section className="w-full py-32 bg-white dark:bg-[#000000]">
          <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
            <div className="w-full md:w-1/2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black dark:text-white mb-6">The document era is over.</h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed mb-8">
                Writing 30-page product requirement documents linearally is inefficient, unreadable, and impossible to maintain.
                Structural nodes allow engineers to visually understand the exact logic pathways in seconds, not hours.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-zinc-800 dark:text-zinc-300 font-medium">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Visual state management over massive text blobs.
                </li>
                <li className="flex items-center gap-3 text-zinc-800 dark:text-zinc-300 font-medium">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Generative LLMs compile the graph to code instantly.
                </li>
              </ul>
            </div>

            <div className="w-full md:w-1/2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent)] blur-xl pointer-events-none" />

                <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-lg relative z-10 hover:-translate-y-1 transition-transform">
                  <div className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Time to Spec</div>
                  <div className="text-4xl font-black text-black dark:text-white mb-2">2 mins</div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Down from 14 hours
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-lg relative z-10 hover:-translate-y-1 transition-transform">
                  <div className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Acceptance Criteria</div>
                  <div className="text-4xl font-black text-black dark:text-white mb-2">100%</div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Automatically generated
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Bento Grid Features */}
        <section className="w-full py-32 bg-zinc-50 dark:bg-[#0A0A0A] border-y border-zinc-200 dark:border-white/5">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black dark:text-white mb-6">Built for scale.</h2>
              <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium">A unified, powerful infrastructure designed specifically for technical product managers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Feature 1 */}
              <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/5 rounded-3xl p-10 md:p-12 relative overflow-hidden group shadow-sm hover:shadow-xl transition-shadow cursor-default">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
                <div className="relative z-10 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                  <Workflow className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-4 relative z-10">Omnipotent Canvas</h3>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium relative z-10 max-w-lg">
                  Connect user pain points, algorithmic logic models, and technical specs on one infinite grid. A fully collaborative, multiplayer environment.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="col-span-1 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/5 rounded-3xl p-10 relative overflow-hidden group shadow-sm hover:shadow-xl transition-shadow cursor-default">
                <div className="relative z-10 w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6">
                  <Cpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-4 relative z-10">Local Connect</h3>
                <p className="text-zinc-600 dark:text-zinc-400 font-medium relative z-10">
                  Harness the power of local Ollama deployments to maintain total privacy while generating extensive product specifications. Zero cloud tracking.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="col-span-1 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/5 rounded-3xl p-10 relative overflow-hidden group shadow-sm hover:shadow-xl transition-shadow cursor-default">
                <div className="relative z-10 w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
                  <Mic className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-4 relative z-10">Audio Intake</h3>
                <p className="text-zinc-600 dark:text-zinc-400 font-medium relative z-10">
                  Connect Whisper.cpp to automatically transcribe and index hundreds of user interviews instantly into vector space.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/5 rounded-3xl p-10 md:p-12 relative overflow-hidden group shadow-sm hover:shadow-xl transition-shadow cursor-default">
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
                <div className="relative z-10 w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                  <GitBranch className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-4 relative z-10">One-Click Dispatch</h3>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium relative z-10 max-w-lg">
                  When the logic is sound, export the entire visual canvas directly into cleanly formatted Jira Epics or Linear Issues.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Section 6: Methodology Timeline */}
        <section className="w-full py-32 bg-white dark:bg-[#000000]">
          <div className="max-w-[1000px] mx-auto px-6">
            <h2 className="text-4xl font-bold text-center text-black dark:text-white mb-20 tracking-tight">A deterministic framework.</h2>

            <div className="relative pl-8 md:pl-0">
              {/* Vertical line passing through steps */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800 transform md:-translate-x-1/2" />

              <div className="space-y-24">
                {[
                  { step: "01", title: "Information Capture", text: "Integrate raw unstructured data (audio clips, support tickets) directly into the environment.", icon: Database },
                  { step: "02", title: "Spatial Logic", text: "Visually map out the system architecture using the infinite whiteboard components.", icon: Workflow },
                  { step: "03", title: "Generative Generation", text: "Local LLMs analyze the graph and compile highly strict BDD specifications.", icon: Cpu },
                  { step: "04", title: "Execution", text: "Bi-directional sync with Linear or Jira keeps engineering and product perfectly aligned.", icon: Rocket }
                ].map((item, i) => (
                  <div key={i} className={`relative flex flex-col md:flex-row items-center gap-8 md:gap-16 ${i % 2 === 0 ? "md:flex-row-reverse" : ""}`}>

                    {/* Node Dot */}
                    <div className="absolute left-[-32px] md:left-1/2 w-6 h-6 rounded-full bg-white dark:bg-black border-4 border-blue-500 transform md:-translate-x-1/2 z-10 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />

                    <div className={`w-full md:w-1/2 ${i % 2 === 0 ? "md:text-left" : "md:text-right"}`}>
                      <div className="inline-flex items-center justify-center px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold rounded mb-4">
                        Phase {item.step}
                      </div>
                      <h3 className="text-2xl font-bold text-black dark:text-white mb-3 flex items-center gap-3 justify-start md:justify-[inherit]">
                        {i % 2 === 0 && <item.icon className="w-6 h-6 text-zinc-400" />}
                        {item.title}
                        {i % 2 !== 0 && <item.icon className="w-6 h-6 text-zinc-400" />}
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                    <div className="hidden md:block w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Pricing / Simple Access */}
        <section className="w-full py-32 bg-zinc-50 dark:bg-[#0A0A0A] border-t border-zinc-200 dark:border-white/5">
          <div className="max-w-[1400px] mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white mb-6">Simple, transparent access.</h2>
            <p className="text-xl text-zinc-500 font-medium mb-16">Start strictly local for free. Upgrade when your team needs cloud synchronization.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">

              <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-[2rem] p-10 hover:border-blue-500/50 transition-colors">
                <h3 className="text-2xl font-bold text-black dark:text-white mb-2">Local Builder</h3>
                <p className="text-zinc-500 font-medium mb-8">For individuals and privacy purists.</p>
                <div className="text-5xl font-black text-black dark:text-white mb-8">$0 <span className="text-lg text-zinc-500 font-medium">/ forever</span></div>

                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-black dark:text-white" /> Infinite local canvas</li>
                  <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-black dark:text-white" /> Bring your own local LLM (Ollama)</li>
                  <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><CheckCircle2 className="w-5 h-5 text-black dark:text-white" /> Core exports</li>
                </ul>
                <button className="w-full py-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  Download Free
                </button>
              </div>

              <div className="bg-black dark:bg-white text-white dark:text-black border border-transparent rounded-[2rem] p-10 relative overflow-hidden transform md:-translate-y-4 shadow-2xl">
                <div className="absolute top-0 right-0 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-bl-xl">Most Popular</div>
                <h3 className="text-2xl font-bold mb-2">Cloud Synced</h3>
                <p className="text-zinc-400 dark:text-zinc-600 font-medium mb-8">For distributed enterprise teams.</p>
                <div className="text-5xl font-black mb-8">$49 <span className="text-lg text-zinc-400 dark:text-zinc-500 font-medium">/ user / mo</span></div>

                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 font-medium"><CheckCircle2 className="w-5 h-5" /> Multiplayer realtime sync</li>
                  <li className="flex items-center gap-3 font-medium"><CheckCircle2 className="w-5 h-5" /> Hosted dedicated Llama-3 instances</li>
                  <li className="flex items-center gap-3 font-medium"><CheckCircle2 className="w-5 h-5" /> Jira & Linear bi-directional sync</li>
                </ul>
                <button className="w-full py-4 rounded-xl bg-white dark:bg-black text-black dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                  Get Started
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* Section 8: Final CTA */}
        <section className="w-full relative py-40 border-t border-zinc-200 dark:border-white/5 bg-white dark:bg-[#000000] overflow-hidden">
          <div className="absolute top-0 inset-x-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)]" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <div className="w-20 h-20 bg-black dark:bg-white rounded-2xl mx-auto flex items-center justify-center mb-10 shadow-xl">
              <Command className="w-8 h-8 text-white dark:text-black" />
            </div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-8 text-black dark:text-white">
              Stop typing.<br />Start building.
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-12 font-medium">
              Join the new standard of product management. Available completely free to start.
            </p>
            <button
              onClick={handleGetStarted}
              className="px-10 py-5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold shadow-xl hover:-translate-y-1 transition-transform text-lg flex items-center justify-center gap-3 mx-auto"
            >
              Initialize Workspace <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

      </main>

      {/* Modern SaaS Footer (Linear Style) */}
      <footer className="w-full bg-zinc-50 dark:bg-[#050505] border-t border-zinc-200 dark:border-white/5 pt-24 pb-12">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-12 font-medium text-sm">

          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex items-center justify-center shadow-sm">
                <Command className="w-4 h-4 text-black dark:text-white" />
              </div>
              <span className="font-bold text-lg text-black dark:text-white">Cursor PM</span>
            </div>
            <p className="text-zinc-500 max-w-xs leading-relaxed mb-6">
              A meticulously crafted intelligence layer explicitly designed for elite product engineering teams.
            </p>
            <div className="flex gap-4">
              <Twitter className="w-5 h-5 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer transition-colors" />
              <Github className="w-5 h-5 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="font-bold text-black dark:text-white mb-6 uppercase tracking-wider text-xs">Product</h4>
            <ul className="space-y-4 text-zinc-500">
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Features</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Integrations</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Pricing</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Changelog</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Docs</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-black dark:text-white mb-6 uppercase tracking-wider text-xs">Company</h4>
            <ul className="space-y-4 text-zinc-500">
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">About</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Blog</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Customers</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Contact</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-black dark:text-white mb-6 uppercase tracking-wider text-xs">Legal</h4>
            <ul className="space-y-4 text-zinc-500">
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Terms of Service</li>
              <li className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Security</li>
            </ul>
          </div>

        </div>

        <div className="max-w-[1400px] mx-auto px-6 mt-24 pt-8 border-t border-zinc-200 dark:border-white/5 flex items-center justify-between text-zinc-500 text-xs font-semibold">
          <p>© {new Date().getFullYear()} Cursor Inc. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
}
