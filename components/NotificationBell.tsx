"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, X, Info, MessageSquare, Target, FlaskConical, ExternalLink } from 'lucide-react';
import { subscribeToNotifications, markAsRead, deleteNotification, markAllAsRead } from '@/lib/notificationService';
import { AppNotification } from '@/types/collaboration';
import Link from 'next/link';

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToNotifications(user.uid, setNotifications);
        return () => unsub();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'mention': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'invite': return <Target className="w-4 h-4 text-emerald-500" />;
            case 'update': return <Info className="w-4 h-4 text-amber-500" />;
            default: return <Bell className="w-4 h-4 text-zinc-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all border border-zinc-200 dark:border-white/10"
            >
                <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900 animate-in zoom-in">
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 max-h-[480px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 rounded-[32px] shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
                            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead(user!.uid)}
                                    className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter hover:underline"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {notifications.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center space-y-3 opacity-40">
                                    <Bell className="w-8 h-8" />
                                    <p className="text-[12px] font-medium">All caught up!</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`group relative p-4 mb-2 rounded-[24px] border transition-all ${notif.read
                                            ? 'bg-transparent border-transparent opacity-60'
                                            : 'bg-blue-500/5 border-blue-500/10'
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">{notif.title}</span>
                                                    <span className="text-[9px] text-zinc-400 font-medium">
                                                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                {notif.link && (
                                                    <Link
                                                        href={notif.link}
                                                        onClick={() => {
                                                            markAsRead(notif.id);
                                                            setIsOpen(false);
                                                        }}
                                                        className="mt-2 text-[10px] font-bold text-blue-500 flex items-center gap-1 group/link"
                                                    >
                                                        View details <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notif.read && (
                                                <button
                                                    onClick={() => markAsRead(notif.id)}
                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notif.id)}
                                                className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-3 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] flex justify-center">
                                <Link
                                    href="/dashboard/notifications"
                                    onClick={() => setIsOpen(false)}
                                    className="text-[11px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    View all activity
                                </Link>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
