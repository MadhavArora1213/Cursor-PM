"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare, Tag, Filter, Search,
    ChevronRight, Sparkles, AlertCircle,
    CheckCircle2, Plus, Loader2, Link as LinkIcon,
    Trash2, User, Mail, Zap, TrendingDown, TrendingUp,
    Inbox, HardDrive, Share2, MessageCircle, Send
} from "lucide-react";
import { getFeedbackByWorkspace, createFeedbackEntry, linkFeedbackToFeature } from "@/lib/feedbackService";
import { UserFeedback } from "@/types/feedback";
import ReactMarkdown from 'react-markdown';

export default function FeedbackTriagePage() {
    const { activeWorkspace } = useWorkspace();
    const { user } = useAuth();

    const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
    const [features, setFeatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'triaged' | 'linked'>('all');

    // New Feedback Form
    const [newFB, setNewFB] = useState({ content: "", source: 'custom_form' as any, email: "" });
    const [submitting, setSubmitting] = useState(false);

    // Linking UI
    const [linkingId, setLinkingId] = useState<string | null>(null);

    useEffect(() => {
        if (activeWorkspace) {
            loadData();
        }
    }, [activeWorkspace]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fbList, featList] = await Promise.all([
                getFeedbackByWorkspace(activeWorkspace!.id),
                fetch(`/api/localdb?collection=features&workspaceId=${activeWorkspace?.id}`).then(r => r.json())
            ]);
            setFeedbacks(fbList || []);
            setFeatures(featList || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFB.content || submitting) return;
        setSubmitting(true);
        try {
            await createFeedbackEntry({
                workspaceId: activeWorkspace!.id,
                rawContent: newFB.content,
                source: newFB.source,
                userEmail: newFB.email
            });
            setNewFB({ content: "", source: 'custom_form', email: "" });
            setIsCreating(false);
            loadData(); // Refresh list
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLinkToFeature = async (fbId: string, featId: string) => {
        try {
            await linkFeedbackToFeature(fbId, featId);
            setLinkingId(null);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredFB = feedbacks.filter(fb => {
        if (activeFilter === 'all') return true;
        return fb.status === activeFilter;
    });

    if (!activeWorkspace) {
        return (
            <div className="h-[80vh] flex items-center justify-center text-zinc-500 font-bold">
                Select a workspace to enter Feedback Triage.
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                        <MessageSquare className="w-3 h-3" /> Customer Signal
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Feedback Triage</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                        Aggregate user feedback and let AI agents auto-tag, summarize, and bridge the gap to your product features.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="h-14 px-8 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-black/10"
                >
                    <Plus className="w-5 h-5" /> Submim Feedback
                </button>
            </header>

            {/* Stats & Filters Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200 dark:border-white/10">
                    {['all', 'new', 'triaged', 'linked'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f as any)}
                            className={`px-6 py-2 rounded-xl text-[12px] font-bold capitalize transition-all ${activeFilter === f
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-6 text-[12px] font-bold text-zinc-400 uppercase tracking-tighter">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        New: {feedbacks.filter(f => f.status === 'new').length}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Triaged: {feedbacks.filter(f => f.status === 'triaged').length}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Linked: {feedbacks.filter(f => f.status === 'linked').length}
                    </div>
                </div>
            </div>

            {/* Feedback Main List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 opacity-40">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <p className="font-bold text-sm">Aggregating customer signal...</p>
                    </div>
                ) : filteredFB.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-4 rounded-[40px] border-2 border-dashed border-zinc-100 dark:border-white/5 text-zinc-400">
                        <Inbox className="w-12 h-12" />
                        <p className="font-medium">No feedback items match this filter.</p>
                    </div>
                ) : (
                    filteredFB.map((fb) => (
                        <motion.div
                            key={fb.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-8 pb-4 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-sm group"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                <div className="lg:col-span-3 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl border ${fb.source === 'discord' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' :
                                                fb.source === 'zendesk' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                    'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400'
                                                }`}>
                                                {fb.source === 'discord' ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-zinc-400">{fb.source}</div>
                                                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{fb.userEmail || 'Anonymous'}</div>
                                            </div>
                                        </div>
                                        {fb.sentimentScore !== undefined && (
                                            <div className={`flex items-center gap-1.5 p-2 rounded-full border ${fb.sentimentScore > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
                                                }`}>
                                                {fb.sentimentScore > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                <span className="text-[10px] font-black">{Math.abs(Math.round(fb.sentimentScore * 100))}% Signal</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[14px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                                            "{fb.rawContent}"
                                        </p>
                                        <AnimatePresence>
                                            {fb.aiSummary && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2"
                                                >
                                                    <div className="flex items-center gap-2 text-amber-500">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">AI Agent Summary</span>
                                                    </div>
                                                    <p className="text-[13px] text-amber-700 dark:text-amber-200 italic font-medium">{fb.aiSummary}</p>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {fb.aiTags?.map(tag => (
                                                            <span key={tag} className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black">#{tag}</span>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-white/5 p-4 flex flex-col">
                                    <div className="flex-1 space-y-4">
                                        <div className="text-[10px] font-black text-zinc-400 uppercase mb-2">Triage Action</div>
                                        {fb.status === 'linked' ? (
                                            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                                <div className="text-[9px] font-black text-emerald-500 uppercase mb-1">Linked Feature</div>
                                                <div className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                                    {features.find(f => f.id === fb.linkedFeatureId)?.title || 'Unknown Feature'}
                                                </div>
                                            </div>
                                        ) : fb.status === 'triaged' ? (
                                            <button
                                                onClick={() => setLinkingId(fb.id)}
                                                className="w-full p-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                                            >
                                                <LinkIcon className="w-4 h-4" /> Link to Feature
                                            </button>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 opacity-30">
                                                <Zap className="w-6 h-6 mb-2 animate-pulse" />
                                                <span className="text-[10px] font-bold">Awaiting AI Agent...</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-4 flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                                        <span>ID: {fb.id}</span>
                                        <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Linking Modal */}
            <AnimatePresence>
                {linkingId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setLinkingId(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[40px] p-10 border border-white/10 shadow-2xl overflow-hidden"
                        >
                            <h3 className="text-2xl font-black mb-6">Link Feedback to Feature</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {features.length === 0 ? (
                                    <p className="py-10 text-center text-zinc-500 font-bold">No features available to link. Create some in Strategy Planner first.</p>
                                ) : (
                                    features.map(feat => (
                                        <button
                                            key={feat.id}
                                            onClick={() => handleLinkToFeature(linkingId, feat.id)}
                                            className="w-full p-6 text-left rounded-3xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[10px] font-black text-blue-500 uppercase">Strategy Backlog</div>
                                                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                            <div className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 mb-1">{feat.title || feat.name}</div>
                                            <p className="text-[11px] text-zinc-500 line-clamp-1 italic">{feat.description || 'No description available'}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Submission Form Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setIsCreating(false)}
                        />
                        <motion.div
                            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[48px] p-12 border border-white/10 shadow-2xl"
                        >
                            <button onClick={() => setIsCreating(false)} className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                            <h2 className="text-3xl font-black mb-2">Submit Feedback</h2>
                            <p className="text-zinc-500 font-medium mb-8">Simulate a multi-channel payload or manual submission.</p>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">Source Channel</label>
                                        <select
                                            value={newFB.source}
                                            onChange={(e) => setNewFB({ ...newFB, source: e.target.value })}
                                            className="w-full h-14 px-6 rounded-2xl bg-zinc-100 dark:bg-white/5 border-none text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        >
                                            <option value="custom_form">Custom Form</option>
                                            <option value="discord">Discord</option>
                                            <option value="zendesk">Zendesk</option>
                                            <option value="intercom">Intercom</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">Customer Email</label>
                                        <input
                                            type="email"
                                            value={newFB.email}
                                            onChange={(e) => setNewFB({ ...newFB, email: e.target.value })}
                                            placeholder="user@example.com"
                                            className="w-full h-14 px-6 rounded-2xl bg-zinc-100 dark:bg-white/5 border-none text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">Raw Feedback Content</label>
                                    <textarea
                                        rows={4}
                                        value={newFB.content}
                                        onChange={(e) => setNewFB({ ...newFB, content: e.target.value })}
                                        placeholder="Paste customer message here..."
                                        className="w-full p-6 rounded-[32px] bg-zinc-100 dark:bg-white/5 border-none text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting || !newFB.content}
                                    className="w-full h-16 bg-blue-600 text-white rounded-[24px] font-black text-sm flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    Process Feedback with AI Agent
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
