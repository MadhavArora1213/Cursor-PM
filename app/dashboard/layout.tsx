"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { signOut } from "@/lib/firebase/auth";
import { LogOut, LayoutDashboard, Search, Users, Settings, ChevronRight, Sparkles } from "lucide-react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const { activeWorkspace } = useWorkspace();
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [isHovered, setIsHovered] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] pointer-events-none" />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-white"
                />
            </div>
        );
    }

    const navItems = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Research Intelligence', href: '/dashboard/research', icon: Search },
        { name: 'Workspace & Team', href: '/dashboard/workspace', icon: Users },
        { name: 'Profile Settings', href: '/dashboard/profile', icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-[#FAFAFA] dark:bg-[#050505] selection:bg-white/20 dark:selection:bg-white/10 text-zinc-900 dark:text-zinc-100 font-sans relative">

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden hidden dark:block z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#2a2a2a] blur-[150px] rounded-full opacity-40 mix-blend-screen" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-[#1a1a1a] blur-[120px] rounded-full opacity-30 mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-[#111111] blur-[100px] rounded-full opacity-50 mix-blend-screen" />
            </div>

            {/* Premium Sidebar */}
            <aside className="w-[280px] fixed inset-y-0 left-0 bg-white/40 dark:bg-[#0A0A0A]/40 backdrop-blur-3xl border-r border-zinc-200/50 dark:border-white/[0.05] hidden md:flex flex-col z-20">

                {/* Brand & Workspace Context */}
                <div className="h-[88px] px-8 flex flex-col justify-center border-b border-zinc-200/50 dark:border-white/[0.05] relative group cursor-pointer transition-all">
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] transition-transform" />
                    <span className="font-bold text-xl tracking-tighter bg-linear-to-br from-zinc-800 to-zinc-500 bg-clip-text text-transparent dark:from-white dark:to-zinc-500 relative z-10 flex items-center gap-2">
                        Cursor PM
                        <Sparkles className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    </span>
                    <div className="flex items-center gap-2 mt-1 relative z-10">
                        <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] ${activeWorkspace ? 'bg-emerald-400' : 'bg-orange-500 animate-pulse'}`}></div>
                        <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wide truncate mt-0.5">
                            {activeWorkspace ? activeWorkspace.name : 'NO WORKSPACE LAB'}
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
                    {navItems.map((item) => {
                        const isCurrent = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onMouseEnter={() => setIsHovered(item.name)}
                                onMouseLeave={() => setIsHovered(null)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-medium transition-all group relative overflow-hidden ${isCurrent
                                    ? 'bg-zinc-900/5 text-zinc-900 dark:bg-white/5 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/[0.05]'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-transparent'
                                    }`}
                            >
                                {isCurrent && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-linear-to-r from-zinc-200/20 to-transparent dark:from-white/5 dark:to-transparent z-0 opacity-50"
                                    />
                                )}

                                <div className="relative z-10 flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-100 dark:bg-white/5 group-hover:scale-110 transition-transform duration-300">
                                    <item.icon className={`w-3.5 h-3.5 transition-colors ${isCurrent ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300'}`} />
                                </div>

                                <span className={`relative z-10 ${isCurrent ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>

                                {isHovered === item.name && !isCurrent && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="absolute right-4 z-10"
                                    >
                                        <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                                    </motion.div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Controls */}
                <div className="p-6">
                    <button
                        onClick={() => setShowSignOutConfirm(true)}
                        className="flex w-full items-center justify-between px-5 py-3.5 rounded-2xl text-[13px] font-semibold text-zinc-500 bg-white dark:bg-white/5 border border-zinc-200/80 dark:border-white/5 hover:bg-zinc-50 hover:border-zinc-300 dark:hover:bg-white/10 dark:hover:border-white/10 transition-all dark:text-zinc-400 group shadow-xs hover:shadow-md"
                    >
                        <span className="group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Terminate Session</span>
                        <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white transition-colors" />
                    </button>

                    {/* Premium Profile Badge */}
                    <div className="mt-6 flex items-center gap-3 p-3 rounded-2xl bg-zinc-50/80 dark:bg-[#0A0A0A]/80 border border-zinc-200/50 dark:border-white/5 shadow-inner">
                        <div className="relative">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-white/10 shadow-sm object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-zinc-200 to-zinc-400 dark:from-zinc-700 dark:to-zinc-900 flex items-center justify-center text-sm font-bold text-zinc-700 dark:text-zinc-300 shadow-sm border border-zinc-300/50 dark:border-white/10">
                                    {user.email?.[0].toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#0A0A0A] rounded-full" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-200 truncate">{user.displayName || 'Anonymous User'}</span>
                            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500 truncate">{user.email}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-[280px] p-6 md:p-12 max-w-[1600px] mx-auto w-full transition-all relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="h-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Ultra Premium Sign Out Modal */}
            <AnimatePresence>
                {showSignOutConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-zinc-900/20 dark:bg-black/60 backdrop-blur-xl"
                            onClick={() => setShowSignOutConfirm(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-[400px] rounded-[32px] bg-white dark:bg-[#0A0A0A] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-zinc-200/50 dark:border-white/10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Decorative background gradients */}
                            <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] bg-linear-to-b from-red-500/10 to-transparent blur-3xl rounded-full dark:from-red-500/20 pointer-events-none" />

                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-50 to-red-100/50 dark:from-red-500/10 dark:to-red-900/10 flex items-center justify-center mb-6 border border-red-200/50 dark:border-red-500/20 shadow-inner">
                                <LogOut className="w-6 h-6 text-red-500 dark:text-red-400" />
                            </div>

                            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
                                Terminate Session?
                            </h3>
                            <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                You are about to log out of your secure PM environment. Active sessions and local contextual data will be cleared.
                            </p>

                            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSignOutConfirm(false)}
                                    className="w-full sm:w-auto rounded-2xl px-6 py-3.5 text-[14px] font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-white/20"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setShowSignOutConfirm(false);
                                        await signOut();
                                        router.push('/');
                                    }}
                                    className="w-full sm:w-auto rounded-2xl bg-zinc-900 dark:bg-white px-6 py-3.5 text-[14px] font-bold text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] dark:shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:focus:ring-offset-black relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                                    <span className="relative z-10">Confirm Exit</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
