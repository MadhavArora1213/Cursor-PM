"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { UserProfile } from "@/components/UserProfile";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Users, Zap, Activity, ChevronRight,
  FileText, Sparkles, Layout, Lightbulb, Search,
  BarChart3, Target, ArrowUpRight, Clock, MessageSquare
} from "lucide-react";
import { getDashboardStats } from "@/lib/firebase/statsService";
import Link from "next/link";

export default function Home() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeWorkspace) {
      getDashboardStats(activeWorkspace.id).then(setStats).finally(() => setLoading(false));
    }
  }, [activeWorkspace]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const targetIcon = Target;

  const dashboardCards = [
    { label: 'Intelligence Repository', value: stats?.totalResearch || '0', sub: 'Research Items', icon: Search, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/dashboard/research' },
    { label: 'Strategizing Engine', value: stats?.analyzedResearch || '0', sub: 'Analyses Complete', icon: targetIcon, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/dashboard/strategy' },
    { label: 'Sentiment Pulse', value: `${stats?.avgSentiment || 0}%`, sub: 'Positive Feedback', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', href: '/dashboard/research' }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-[1200px] w-full mx-auto space-y-10 pb-20"
    >
      {/* 1. HERO HEADER */}
      <motion.header variants={itemVariants} className="relative py-4">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4">
              <Sparkles className="w-3 h-3" /> Command Center v2.0
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.9]">
              Welcome, {user?.displayName ? user.displayName.split(' ')[0] : 'Innovator'}.
            </h1>
            <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
              {activeWorkspace ? `Managing ${activeWorkspace.name}` : 'Select a workspace to begin discovering product truth.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/canvas" className="group px-5 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-blue-500/10">
              Launch Canvas <Layout className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* 2. STATS GRID */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dashboardCards.map((card, i) => (
          <Link key={card.label} href={card.href}>
            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative p-7 rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-zinc-200/50 dark:border-white/5 shadow-sm overflow-hidden group h-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <ArrowUpRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
              </div>
              <div>
                <div className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-1">{card.value}</div>
                <div className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100">{card.label}</div>
                <div className="text-[12px] text-zinc-400 font-medium">{card.sub}</div>
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. LATEST INSIGHT BANNER */}
        <motion.section variants={itemVariants} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Latest Discovery Signal
            </h2>
            <Link href="/dashboard/research" className="text-xs font-bold text-blue-500 hover:underline">View Intelligence Hub</Link>
          </div>
          <div className="relative p-8 rounded-[40px] bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-2xl overflow-hidden group min-h-[300px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 blur-[60px] rounded-full -translate-x-1/2 translate-y-1/2" />

            <div className="relative z-10">
              {loading ? (
                <div className="flex gap-1 items-center h-20 animate-pulse bg-white/10 rounded-2xl px-4" />
              ) : stats?.latestInsight ? (
                <>
                  <div className="flex items-center gap-2 text-white/70 text-[11px] font-bold tracking-widest uppercase mb-4">
                    <Clock className="w-3 h-3" /> Latest Insight from {stats.latestInsight.title}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold leading-tight mb-4">
                    "{stats.latestInsight.summary?.split('.')[0]}..."
                  </h3>
                  <p className="text-white/80 line-clamp-3 text-sm leading-relaxed max-w-lg mb-6">
                    {stats.latestInsight.summary?.substring(stats.latestInsight.summary.indexOf('.') + 1, 300).replace(/[#*`_]/g, '')}
                  </p>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-10 opacity-60">
                  <MessageSquare className="w-12 h-12 mb-4" />
                  <p className="font-bold">No intelligence processed yet.</p>
                  <p className="text-sm opacity-80">Upload research to generate signals.</p>
                </div>
              )}
            </div>

            {stats?.latestInsight && (
              <Link href={`/dashboard/research?focus=${stats.latestInsight.id}`} className="relative z-10 self-start px-6 py-2.5 bg-white/20 backdrop-blur-md rounded-full text-[12px] font-bold hover:bg-white/30 transition-all flex items-center gap-2 border border-white/20">
                Deep Dive Insight <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </motion.section>

        {/* 4. QUICK ACTIONS & PROFILE */}
        <motion.section variants={itemVariants} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white px-2">Account</h2>
            <UserProfile />
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white px-2">Workflows</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { name: 'Canvas Workspace', icon: Layout, href: '/dashboard/canvas', color: 'text-blue-500' },
                { name: 'Strategy Planner', icon: Lightbulb, href: '/dashboard/strategy', color: 'text-amber-500' },
                { name: 'Research Repository', icon: Search, href: '/dashboard/research', color: 'text-emerald-500' }
              ].map(tool => (
                <Link key={tool.name} href={tool.href} className="group p-4 bg-white dark:bg-[#0A0A0A] border border-zinc-200/50 dark:border-white/5 rounded-2xl flex items-center justify-between hover:border-zinc-900 dark:hover:border-white transition-all shadow-xs">
                  <div className="flex items-center gap-3">
                    <tool.icon className={`w-5 h-5 ${tool.color}`} />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{tool.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
