"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { UserProfile } from "@/components/UserProfile";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Users, Zap, Activity, ChevronRight,
  FileText, Sparkles, Layout, Lightbulb, Search,
  BarChart3, Target, ArrowUpRight, Clock, MessageSquare,
  FlaskConical, Terminal, Brain, CheckCircle2, AlertCircle,
  ShieldCheck, Layers
} from "lucide-react";
import { getDashboardStats, DashboardStats } from "@/lib/firebase/statsService";
import Link from "next/link";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

export default function Home() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeWorkspace) {
      loadStats();
    }
  }, [activeWorkspace]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats(activeWorkspace!.id);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  // --- STATS CARDS ---
  const statsOverview = [
    { label: 'Intelligence Repository', value: stats?.totalResearch || '0', sub: 'Research Docs', icon: Search, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/dashboard/research' },
    { label: 'Strategic Backlog', value: stats?.totalFeatures || '0', sub: 'Prioritized Features', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10', href: '/dashboard/strategy' },
    { label: 'Validation Experiments', value: stats?.totalExperiments || '0', sub: 'Hypotheses Tested', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/dashboard/validation' },
    { label: 'Engineering Specs', value: stats?.totalSpecs || '0', sub: 'Tech Drafts Ready', icon: Terminal, color: 'text-emerald-500', bg: 'bg-emerald-500/10', href: '/dashboard/engineering' }
  ];

  // --- CHART DATA ---
  const coverageData = {
    labels: ['Research', 'Strategy', 'Validation', 'Engineering'],
    datasets: [{
      data: [
        stats?.analyzedResearch || 0,
        stats?.totalFeatures || 0,
        stats?.completedExperiments || 0,
        stats?.totalSpecs || 0
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.5)',
        'rgba(245, 158, 11, 0.5)',
        'rgba(147, 51, 234, 0.5)',
        'rgba(16, 185, 129, 0.5)'
      ],
      borderColor: [
        '#3b82f6', '#f59e0b', '#9333ea', '#10b981'
      ],
      borderWidth: 2,
    }]
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-[1300px] w-full mx-auto space-y-10 pb-20"
    >
      {/* 1. HERO HEADER */}
      <motion.header variants={itemVariants} className="relative py-4">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest shadow-lg">
              <Activity className="w-3 h-3" /> Live Control Center
            </div>
            <h1 className="text-4xl sm:text-7xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.85]">
              {loading ? 'Aggregating...' : (
                <>Hello, <span className="text-zinc-400">{user?.displayName?.split(' ')[0] || 'Innovator'}</span>.</>
              )}
            </h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
              {activeWorkspace ? (
                <>Synchronizing <span className="text-zinc-900 dark:text-zinc-100 font-bold">"{activeWorkspace.name}"</span> with your engineering goals.</>
              ) : 'Select a workspace to enter the command center.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadStats} className="p-4 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all">
              <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/dashboard/knowledge" className="group px-8 py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm flex items-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-black/10 dark:shadow-white/5">
              Query Brain <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* 2. STATS GRID */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsOverview.map((card) => (
          <Link key={card.label} href={card.href} className="group">
            <motion.div
              whileHover={{ y: -5 }}
              className="relative p-7 rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-zinc-100 dark:border-white/5 shadow-sm group-hover:shadow-xl group-hover:border-zinc-200 dark:group-hover:border-white/10 transition-all h-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-opacity" />
              </div>
              <div>
                <div className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-1">
                  {loading ? '...' : card.value}
                </div>
                <div className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100">{card.label}</div>
                <div className="text-[12px] text-zinc-400 font-medium">{card.sub}</div>
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. CENTER COLUMN: INSIGHTS & DISTRIBUTION */}
        <div className="lg:col-span-2 space-y-8">
          {/* Latest Insight Hero */}
          <motion.section variants={itemVariants} className="relative p-10 rounded-[48px] bg-zinc-900 text-white shadow-2xl overflow-hidden group min-h-[400px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 blur-[100px] rounded-full translate-x-1/4 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2" />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2 text-blue-400 overflow-hidden">
                <Sparkles className="shrink-0 w-5 h-5 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Neural Insight Pulse</span>
              </div>

              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-10 bg-white/10 rounded-full w-3/4" />
                  <div className="h-4 bg-white/5 rounded-full w-1/2" />
                  <div className="h-4 bg-white/5 rounded-full w-2/3" />
                </div>
              ) : stats?.latestInsight ? (
                <>
                  <h2 className="text-3xl md:text-5xl font-black leading-[0.9] tracking-tighter">
                    "{stats.latestInsight.summary?.split('.')[0]}..."
                  </h2>
                  <p className="text-lg text-zinc-400 font-medium max-w-2xl leading-relaxed">
                    Derived from <span className="text-white">"{stats.latestInsight.title}"</span>. This discovery signal suggests a key pivot point for your Q4 strategy.
                  </p>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 space-y-4 border-2 border-dashed border-white/5 rounded-[32px]">
                  <MessageSquare className="w-12 h-12" />
                  <p className="font-bold">No strategic signals detected yet.</p>
                  <p className="text-sm opacity-60">Upload research or finalize features to see AI sparks.</p>
                </div>
              )}
            </div>

            {stats?.latestInsight && (
              <div className="relative z-10 flex flex-wrap gap-4 pt-8">
                <Link href={`/dashboard/research`} className="h-12 px-8 bg-white text-black rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-zinc-200 transition-all">
                  Deep Dive Research <ChevronRight className="w-4 h-4" />
                </Link>
                <Link href={`/dashboard/knowledge`} className="h-12 px-8 bg-zinc-800 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-zinc-700 transition-all border border-white/5">
                  Ask Q&A <MessageSquare className="w-4 h-4 text-blue-400" />
                </Link>
              </div>
            )}
          </motion.section>

          {/* Activity & Distribution Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.section variants={itemVariants} className="p-8 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-100 dark:border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Activity Stream</h3>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
                  <p className="text-sm text-zinc-400 italic py-10 text-center">No recent activity detected.</p>
                ) : (
                  stats.recentActivity.map((act, i) => (
                    <div key={i} className="flex gap-4 items-start group">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-100 dark:border-white/5 transition-transform group-hover:scale-105">
                        {act.type === 'research' && <Search className="w-4 h-4 text-blue-500" />}
                        {act.type === 'feature' && <Lightbulb className="w-4 h-4 text-amber-500" />}
                        {act.type === 'experiment' && <FlaskConical className="w-4 h-4 text-purple-500" />}
                        {act.type === 'spec' && <Terminal className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-500 transition-colors uppercase tracking-tighter">
                          {act.title}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase">
                          <span>{act.type}</span>
                          <span>•</span>
                          <span>{new Date(act.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="p-8 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-100 dark:border-white/5 flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-8 self-start">Workspace Equilibrium</h3>
              <div className="w-full max-w-[220px]">
                <Doughnut
                  data={coverageData}
                  options={{
                    cutout: '75%',
                    plugins: { legend: { display: false } },
                    animation: { duration: 2000 }
                  }}
                />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 text-left border border-zinc-100 dark:border-white/5">
                  <div className="text-[10px] font-black text-zinc-400 uppercase">Health Score</div>
                  <div className="text-xl font-black text-emerald-500">92%</div>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 text-left border border-zinc-100 dark:border-white/5">
                  <div className="text-[10px] font-black text-zinc-400 uppercase">Velocity</div>
                  <div className="text-xl font-black text-blue-500">Fast</div>
                </div>
              </div>
            </motion.section>
          </div>
        </div>

        {/* 4. RIGHT COLUMN: QUICK NAV & TOOLS */}
        <motion.section variants={itemVariants} className="space-y-8">
          <div className="p-1 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-100 dark:border-white/5 shadow-sm overflow-hidden">
            <UserProfile />
            <div className="p-6 pt-0 space-y-3">
              <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] font-bold text-zinc-600 dark:text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Subscription
                </div>
                <span className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Enterprise</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-black text-zinc-900 dark:text-white px-2 tracking-widest uppercase">Ecosystem Workflows</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { name: 'Canvas Workspace', icon: Layout, href: '/dashboard/canvas', color: 'text-blue-500', desc: 'Visual strategy board' },
                { name: 'Strategy Planner', icon: Lightbulb, href: '/dashboard/strategy', color: 'text-amber-500', desc: 'Prioritize & Roadmap' },
                { name: 'Engineering Specs', icon: Terminal, href: '/dashboard/engineering', color: 'text-emerald-500', desc: 'AI Technical drafting' },
                { name: 'Knowledge Hub', icon: Brain, href: '/dashboard/knowledge', color: 'text-purple-500', desc: 'Semantic search brain' }
              ].map(tool => (
                <Link key={tool.name} href={tool.href} className="group p-5 bg-white dark:bg-[#0A0A0A] border border-zinc-100 dark:border-white/5 rounded-[32px] flex items-center justify-between hover:border-zinc-900 dark:hover:border-white transition-all shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-white/5">
                      <tool.icon className={`w-5 h-5 ${tool.color}`} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tighter">{tool.name}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{tool.desc}</div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronRight className="w-4 h-4 text-blue-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
