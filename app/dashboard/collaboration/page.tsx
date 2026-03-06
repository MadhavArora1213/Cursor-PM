"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, MessageSquare, Send, Bell,
    Calendar, Video, Layout, Trash2,
    Check, BellOff, ArrowRight, Plus
} from 'lucide-react';
import {
    subscribeToComments, addComment, deleteComment,
    subscribeToWorkshops, createWorkshop, startWorkshop, endWorkshop, joinWorkshop,
    subscribeToNotifications, markNotificationRead
} from '@/lib/firebase/collaborationService';
import { Comment, WorkshopSession, AppNotification } from '@/types/collaboration';
import { Whiteboard } from '@/components/Whiteboard';

export default function CollaborationCenter() {
    const { user } = useAuth();
    const { activeWorkspace } = useWorkspace();

    // States
    const [comments, setComments] = useState<Comment[]>([]);
    const [workshops, setWorkshops] = useState<WorkshopSession[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [newComment, setNewComment] = useState("");
    const [activeTab, setActiveTab] = useState<'feed' | 'workshops' | 'notifications'>('feed');
    const [showCreateWorkshop, setShowCreateWorkshop] = useState(false);
    const [activeWorkshopSession, setActiveWorkshopSession] = useState<WorkshopSession | null>(null);
    const [workshopForm, setWorkshopForm] = useState({ title: "", description: "" });

    // REALTIME SUBSCRIPTIONS
    useEffect(() => {
        if (!activeWorkspace || !user) return;

        // 1. Comments feed (global for workspace for now)
        const unsubComments = subscribeToComments('workspace', activeWorkspace.id, setComments);
        // 2. Workshops
        const unsubWorkshops = subscribeToWorkshops(activeWorkspace.id, setWorkshops);
        // 3. Notifications
        const unsubNotifications = subscribeToNotifications(user.uid, setNotifications);

        return () => {
            unsubComments();
            unsubWorkshops();
            unsubNotifications();
        };
    }, [activeWorkspace, user]);

    const handleSendComment = async () => {
        if (!newComment.trim() || !activeWorkspace || !user) return;

        await addComment({
            workspaceId: activeWorkspace.id,
            itemId: activeWorkspace.id, // Workspace global
            itemType: 'research', // Temporary
            authorId: user.uid,
            authorName: user.displayName || "Anonymous",
            authorAvatar: user.photoURL || undefined,
            content: newComment
        });

        setNewComment("");
    };

    const handleCreateWorkshop = async () => {
        if (!workshopForm.title.trim() || !activeWorkspace || !user) return;

        await createWorkshop({
            workspaceId: activeWorkspace.id,
            title: workshopForm.title,
            description: workshopForm.description,
            creatorId: user.uid,
            participants: [user.uid],
            startTime: new Date().toISOString()
        });

        setShowCreateWorkshop(false);
        setWorkshopForm({ title: "", description: "" });
    };

    const handleEnterWorkshop = async (ws: WorkshopSession) => {
        if (!user) return;
        await joinWorkshop(ws.id, user.uid);
        setActiveWorkshopSession(ws);
        setActiveTab('workshops');
    };

    if (!activeWorkspace) {
        return (
            <div className="h-full flex items-center justify-center text-zinc-500 font-bold">
                Select a workspace to enter Collaboration Space.
            </div>
        );
    }

    if (activeWorkshopSession) {
        return (
            <div className="h-full space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => setActiveWorkshopSession(null)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all font-bold text-sm">
                        <ArrowRight className="w-4 h-4 rotate-180" /> Leave Room
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {activeWorkshopSession.participants?.map((p, i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0A0A0A] bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                    {p.substring(0, 2).toUpperCase()}
                                </div>
                            ))}
                        </div>
                        {activeWorkshopSession.status === 'planned' && activeWorkshopSession.creatorId === user?.uid && (
                            <button onClick={() => startWorkshop(activeWorkshopSession.id)} className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">Start Session</button>
                        )}
                        {activeWorkshopSession.status === 'active' && activeWorkshopSession.creatorId === user?.uid && (
                            <button onClick={() => endWorkshop(activeWorkshopSession.id)} className="px-5 py-2 bg-red-500 text-white rounded-xl text-xs font-bold">End Session</button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3">
                        <h2 className="text-2xl font-bold mb-2">{activeWorkshopSession.title}</h2>
                        <p className="text-zinc-500 text-sm mb-6">{activeWorkshopSession.description}</p>
                        <Whiteboard workshopId={activeWorkshopSession.id} />
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-6 rounded-3xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-indigo-500" /> Session Context
                            </h3>
                            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                                <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Creator</div>
                                <div className="text-sm font-bold">{activeWorkshopSession.creatorId === user?.uid ? "You (Lead)" : "Team Member"}</div>

                                <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Status</div>
                                <div className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${activeWorkshopSession.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                    {activeWorkshopSession.status.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header Section */}
            <header className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                    <Users className="w-3 h-3" /> Realtime Team Sync
                </div>
                <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Collaboration Space</h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-2xl">
                    Connect, discuss, and workshop ideas in realtime with your product squad.
                </p>
            </header>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-white/5">
                {[
                    { id: 'feed', label: 'Activity Feed', icon: MessageSquare },
                    { id: 'workshops', label: 'Workshops', icon: Layout },
                    { id: 'notifications', label: 'Notifications', icon: Bell }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative ${activeTab === tab.id
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                        )}
                        {tab.id === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                            <span className="w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                                {notifications.filter(n => !n.read).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Main Content Areas */}
            <AnimatePresence mode="wait">
                {activeTab === 'feed' && (
                    <motion.div
                        key="feed"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 lg:grid-cols-4 gap-10"
                    >
                        {/* Feed Column */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Comment Input */}
                            <div className="p-6 rounded-3xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 shadow-sm">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold">
                                        {user?.displayName?.[0] || user?.email?.[0]}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Discuss a feature, post a research link..."
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm placeholder:text-zinc-500 resize-none min-h-[80px]"
                                        />
                                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/5">
                                            <span className="text-[11px] font-medium text-zinc-400">Press Cmd+Enter to post</span>
                                            <button
                                                onClick={handleSendComment}
                                                className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-[12px] font-bold flex items-center gap-2 hover:opacity-90 transition-all"
                                            >
                                                Post Signal <Send className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feed List */}
                            <div className="space-y-4">
                                {comments.length === 0 ? (
                                    <div className="py-20 text-center opacity-40">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                                        <p className="font-bold uppercase tracking-widest text-[10px]">No signals in the feed</p>
                                    </div>
                                ) : (
                                    comments.map(comment => (
                                        <motion.div
                                            layout
                                            key={comment.id}
                                            className="p-5 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 flex gap-4 group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-sm font-bold flex-shrink-0">
                                                {comment.authorName[0]}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">{comment.authorName}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-medium text-zinc-400">
                                                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {comment.authorId === user?.uid && (
                                                            <button onClick={() => deleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{comment.content}</p>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sidebar Info */}
                        <div className="lg:col-span-1 space-y-8">
                            <div className="p-6 rounded-3xl bg-indigo-500 text-white relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 blur-[40px] rounded-full" />
                                <h3 className="text-lg font-bold mb-2">Realtime Sync</h3>
                                <p className="text-sm opacity-80 mb-4">Everything in this space updates instantly for your whole team.</p>
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-zinc-800 flex items-center justify-center text-[10px] font-bold">U{i}</div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-indigo-300">+2</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Workspace Members</h4>
                                {activeWorkspace.members?.map((m, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">{m.userId === user?.uid ? "You" : m.userId.substring(0, 8)}</span>
                                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 uppercase font-black">{m.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'workshops' && (
                    <motion.div
                        key="workshops"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Workshop Hub</h2>
                            <button
                                onClick={() => setShowCreateWorkshop(true)}
                                className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl text-sm font-bold flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Start Live Workshop
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {workshops.map(ws => (
                                <motion.div
                                    key={ws.id}
                                    whileHover={{ y: -5 }}
                                    className="p-8 rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 relative group h-full flex flex-col justify-between"
                                >
                                    <div>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${ws.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                            }`}>
                                            <Video className="w-6 h-6" />
                                        </div>
                                        {ws.status === 'active' && (
                                            <div className="absolute top-8 right-8 flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Live Now
                                            </div>
                                        )}
                                        <h3 className="text-xl font-bold mb-2">{ws.title}</h3>
                                        <p className="text-zinc-500 text-sm line-clamp-2">{ws.description}</p>
                                    </div>
                                    <div className="pt-8 flex items-center justify-between">
                                        <div className="text-[11px] font-bold text-zinc-400">
                                            {new Date(ws.createdAt).toLocaleDateString()}
                                        </div>
                                        <button
                                            onClick={() => handleEnterWorkshop(ws)}
                                            className="px-5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[12px] font-bold group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all"
                                        >
                                            Enter Room
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'notifications' && (
                    <motion.div
                        key="notifications"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="max-w-2xl mx-auto space-y-4"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Personal Signals</h2>
                            <button className="text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2">
                                <BellOff className="w-3.5 h-3.5" /> Mute all for 1h
                            </button>
                        </div>

                        {notifications.length === 0 ? (
                            <div className="py-20 text-center opacity-40">
                                <Bell className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-bold uppercase tracking-widest text-[10px]">Your signal terminal is quiet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-6 rounded-[24px] border transition-all flex items-center gap-4 ${n.read
                                        ? 'bg-transparent border-zinc-100 dark:border-white/5 opacity-60'
                                        : 'bg-white dark:bg-[#0A0A0A] border-indigo-500/30'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${n.type === 'mention' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                                        }`}>
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-[13px] font-bold text-zinc-900 dark:text-white">{n.title}</h4>
                                        <p className="text-[12px] text-zinc-500">{n.message}</p>
                                    </div>
                                    {!n.read && (
                                        <button
                                            onClick={() => markNotificationRead(n.id)}
                                            className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-110 transition-transform"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Workshop Modal */}
            <AnimatePresence>
                {showCreateWorkshop && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setShowCreateWorkshop(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md rounded-[40px] bg-white dark:bg-[#0A0A0A] p-10 border border-zinc-200 dark:border-white/10"
                        >
                            <h3 className="text-2xl font-black mb-6">Launch Workshop</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Session Goal</label>
                                    <input
                                        value={workshopForm.title}
                                        onChange={(e) => setWorkshopForm({ ...workshopForm, title: e.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-indigo-500"
                                        placeholder="e.g. Q4 Strategy Sync"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Brief Agenda</label>
                                    <textarea
                                        value={workshopForm.description}
                                        onChange={(e) => setWorkshopForm({ ...workshopForm, description: e.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-white/5 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-indigo-500 resize-none h-24"
                                        placeholder="What will you accomplish?"
                                    />
                                </div>
                                <button
                                    onClick={handleCreateWorkshop}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
                                >
                                    Initiate Realtime Session <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
