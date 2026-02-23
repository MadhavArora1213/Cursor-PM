"use client";

import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/UserProfile";
import { motion } from "framer-motion";
import { TrendingUp, Users, Zap, Activity, ChevronRight } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const stats = [
    { label: 'Active Experiments', value: '4', trend: '+2 this week', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'User Interviews', value: '12', trend: '+4 this week', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Features Shipped', value: '8', trend: 'On track', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-[1200px] w-full mx-auto space-y-12 pb-20"
    >
      {/* Premium Header */}
      <motion.header variants={itemVariants} className="flex flex-col relative">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">
          Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}.
        </h1>
        <p className="mt-4 text-[16px] text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed font-medium">
          Here's a pulse check on your product ecosystem. Manage your research, active experiments, and team workflows in one unified command center.
        </p>
      </motion.header>

      {/* Advanced Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative p-6 rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-zinc-200/50 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden group"
          >
            {/* Hover Gradient Effect */}
            <div className="absolute inset-0 bg-linear-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[32px] pointer-events-none" />

            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-zinc-100 dark:bg-white/5 ${stat.color}`}>
                {stat.trend}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mb-2">{stat.value}</div>
              <div className="text-[14px] font-semibold text-zinc-500 dark:text-zinc-400">{stat.label}</div>
            </div>

            {/* Sparkline Graphic */}
            <div className="absolute bottom-0 left-0 right-0 h-1bg-zinc-100 dark:bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${60 + (i * 15)}%` }}
                transition={{ duration: 1.5, delay: 0.5 + (i * 0.1), ease: "circOut" }}
                className={`h-1 ${stat.bg.replace('/10', '')}`}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
        {/* User Profile Summary */}
        <motion.section variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
              Account Configuration
            </h2>
          </div>
          <UserProfile />
        </motion.section>

        {/* Recent Activity Premium Timeline Placeholder */}
        <motion.section variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
              Pulse Activity
            </h2>
            <button className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-zinc-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden dark:border-white/5 h-full min-h-[460px] relative p-8">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />

            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, repeatType: "reverse" }}
                className="w-20 h-20 bg-zinc-50 dark:bg-white/5 rounded-3xl flex items-center justify-center border border-zinc-200/50 dark:border-white/10 mb-6 shadow-xl backdrop-blur-sm"
              >
                <Activity className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
              </motion.div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Awaiting telemetry</h3>
              <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400 max-w-[280px] text-center leading-relaxed">
                Your workspace activities, team updates, and automated insights will stream here in real-time.
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-8 px-6 py-3 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-semibold text-sm hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors"
              >
                Connect Data Sources
              </motion.button>
            </div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
