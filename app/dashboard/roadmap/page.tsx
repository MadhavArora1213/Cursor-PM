"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    Map, List, Plus, Sparkles, Send,
    Trash2, Edit3, CheckCircle2, Clock,
    ChevronRight, ExternalLink, Globe,
    Lock, Star, Rocket, Settings, Loader2,
    Calendar, RefreshCcw, FileText, Share2
} from "lucide-react";
import {
    getRoadmapByWorkspace,
    getChangelogsByWorkspace,
    upsertRoadmapItem,
    deleteRoadmapItem,
    generateAIChangelog,
    publishChangelog
} from "@/lib/roadmapService";
import { RoadmapItem, ChangelogEntry } from "@/types/roadmap";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function RoadmapChangelogPage() {
    const { activeWorkspace } = useWorkspace();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'roadmap' | 'changelog'>('roadmap');
    const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
    const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isDraftingChangelog, setIsDraftingChangelog] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);

    // Temp states for new items
    const [newItem, setNewItem] = useState<Partial<RoadmapItem>>({
        title: '', description: '', status: 'planned', isPublic: true, priority: 'medium'
    });
    const [newLog, setNewLog] = useState<Partial<ChangelogEntry>>({
        version: 'v1.0.0', title: '', content: '', categories: ['feature'], isPublished: false
    });

    useEffect(() => {
        if (activeWorkspace) {
            loadData();
        }
    }, [activeWorkspace]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [roadmap, logs] = await Promise.all([
                getRoadmapByWorkspace(activeWorkspace!.id),
                getChangelogsByWorkspace(activeWorkspace!.id)
            ]);
            setRoadmapItems(roadmap || []);
            setChangelogs(logs || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveItem = async () => {
        if (!newItem.title || !activeWorkspace) return;
        try {
            await upsertRoadmapItem(activeWorkspace.id, newItem);
            setIsAddingItem(false);
            setNewItem({ title: '', description: '', status: 'planned', isPublic: true, priority: 'medium' });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (confirm("Delete this roadmap item?")) {
            await deleteRoadmapItem(id);
            loadData();
        }
    };

    const handleGenerateAI = async () => {
        setGeneratingAI(true);
        try {
            const content = await generateAIChangelog(activeWorkspace!.id, newLog.version || 'v1.0.0');
            if (content) {
                setNewLog({ ...newLog, content });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleSaveLog = async () => {
        if (!newLog.title || !newLog.content || !activeWorkspace) return;
        try {
            await publishChangelog(activeWorkspace.id, newLog);
            setIsDraftingChangelog(false);
            setNewLog({ version: 'v1.0.0', title: '', content: '', categories: ['feature'], isPublished: false });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    if (!activeWorkspace) {
        return <div className="h-[80vh] flex items-center justify-center text-zinc-500 font-bold">Select a workspace to manage roadmap.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                        <Globe className="w-3 h-3" /> External Communications
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Roadmap & Changelog</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                        Build trust with your users by sharing what's coming next and celebrating what's already been delivered.
                    </p>
                </div>
                <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200 dark:border-white/10">
                    <button
                        onClick={() => setActiveTab('roadmap')}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'roadmap' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                        Roadmap
                    </button>
                    <button
                        onClick={() => setActiveTab('changelog')}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'changelog' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                        Changelog
                    </button>
                </div>
            </header>

            {/* TAB CONTENT: ROADMAP */}
            <AnimatePresence mode="wait">
                {activeTab === 'roadmap' && (
                    <motion.div
                        key="roadmap"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Control Bar */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <List className="w-5 h-5 text-blue-500" /> Strategic Timeline
                            </h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsAddingItem(true)}
                                    className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-black flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-black/10"
                                >
                                    <Plus className="w-4 h-4" /> Add Item
                                </button>
                                <button className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Kanban-style Roadmap Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { id: 'planned', title: 'Planned', icon: Clock, color: 'text-amber-500' },
                                { id: 'in-progress', title: 'In Progress', icon: Rocket, color: 'text-blue-500' },
                                { id: 'completed', title: 'Completed', icon: CheckCircle2, color: 'text-emerald-500' }
                            ].map(col => (
                                <div key={col.id} className="space-y-4">
                                    <div className="flex items-center gap-2 px-3">
                                        <col.icon className={`w-4 h-4 ${col.color}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{col.title}</span>
                                        <span className="ml-auto px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-white/5 text-[10px] font-bold">
                                            {roadmapItems.filter(i => i.status === col.id).length}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {roadmapItems.filter(i => i.status === col.id).map(item => (
                                            <motion.div
                                                layoutId={item.id}
                                                key={item.id}
                                                className="p-5 rounded-3xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 shadow-sm relative group hover:shadow-xl transition-all"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${item.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                                                            item.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                                                                'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                                        }`}>
                                                        {item.priority}
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleDeleteItem(item.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">{item.title}</h3>
                                                <p className="text-[12px] text-zinc-400 font-medium line-clamp-3 mb-4">{item.description}</p>

                                                <div className="flex items-center justify-between border-t border-zinc-50 dark:border-white/5 pt-4">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                                                        {item.isPublic ? <Globe className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-amber-500" />}
                                                        <span>{item.isPublic ? 'Public' : 'Internal'}</span>
                                                    </div>
                                                    {item.quarter && (
                                                        <span className="text-[10px] font-black text-blue-500">{item.quarter}</span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* TAB CONTENT: CHANGELOG */}
                {activeTab === 'changelog' && (
                    <motion.div
                        key="changelog"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Control Bar */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Rocket className="w-5 h-5 text-emerald-500" /> Product Updates
                            </h2>
                            <button
                                onClick={() => setIsDraftingChangelog(true)}
                                className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-black flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-black/10"
                            >
                                <Plus className="w-4 h-4" /> New Release
                            </button>
                        </div>

                        {/* Changelog Timeline */}
                        <div className="space-y-6">
                            {changelogs.length === 0 ? (
                                <div className="py-20 flex flex-col items-center gap-4 border-2 border-dashed border-zinc-100 dark:border-white/5 rounded-[48px] text-zinc-400">
                                    <Clock className="w-12 h-12 opacity-20" />
                                    <p className="font-bold">No release history found.</p>
                                </div>
                            ) : (
                                changelogs.map(log => (
                                    <motion.div
                                        key={log.id}
                                        className="p-10 rounded-[48px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 shadow-sm relative overflow-hidden group"
                                    >
                                        <div className="absolute top-0 right-0 p-10 opacity-5">
                                            <Rocket className="w-48 h-48 rotate-12" />
                                        </div>
                                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-12">
                                            <div className="lg:col-span-1 space-y-4">
                                                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2">Release v{log.version}</div>
                                                <h3 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 leading-tight">
                                                    {log.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{new Date(log.releaseDate).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {log.categories.map(cat => (
                                                        <span key={cat} className="px-3 py-1 rounded-full bg-zinc-50 dark:bg-white/5 text-[9px] font-black uppercase text-zinc-500">
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="lg:col-span-3 prose dark:prose-invert max-w-none">
                                                <div className="text-[14px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.content}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL: ADD ROADMAP ITEM */}
            <AnimatePresence>
                {isAddingItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setIsAddingItem(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[48px] p-12 border border-white/10 shadow-2xl space-y-8"
                        >
                            <h2 className="text-3xl font-black tracking-tighter">Draft Roadmap Item</h2>
                            <div className="space-y-4">
                                <input
                                    className="w-full h-14 px-6 rounded-2xl bg-zinc-100 dark:bg-white/5 text-sm font-bold outline-none border-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Feature Title..."
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                />
                                <textarea
                                    className="w-full h-32 p-6 rounded-3xl bg-zinc-100 dark:bg-white/5 text-sm font-bold outline-none border-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Describe the impact..."
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        className="h-14 px-6 rounded-2xl bg-zinc-100 dark:bg-white/5 text-xs font-black uppercase outline-none border-none"
                                        value={newItem.status}
                                        onChange={e => setNewItem({ ...newItem, status: e.target.value as any })}
                                    >
                                        <option value="planned">Planned</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                    <select
                                        className="h-14 px-6 rounded-2xl bg-zinc-100 dark:bg-white/5 text-xs font-black uppercase outline-none border-none"
                                        value={newItem.priority}
                                        onChange={e => setNewItem({ ...newItem, priority: e.target.value as any })}
                                    >
                                        <option value="low">Low Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="high">High Priority</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={handleSaveItem}
                                className="w-full h-16 bg-blue-600 text-white rounded-3xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                            >
                                Publish to Roadmap
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: DRAFT CHANGELOG */}
            <AnimatePresence>
                {isDraftingChangelog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setIsDraftingChangelog(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[48px] p-12 border border-white/10 shadow-2xl space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-black tracking-tighter">Draft Release Log</h2>
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={generatingAI}
                                    className="px-6 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    AI Ghost Writer
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <input
                                        className="w-full h-14 px-6 rounded-2xl bg-zinc-100 dark:bg-white/5 text-sm font-bold outline-none border-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="v1.0.0"
                                        value={newLog.version}
                                        onChange={e => setNewLog({ ...newLog, version: e.target.value })}
                                    />
                                    <input
                                        className="col-span-2 w-full h-14 px-6 rounded-2xl bg-zinc-100 dark:bg-white/5 text-sm font-bold outline-none border-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Release Title (e.g., The Productivity Update)"
                                        value={newLog.title}
                                        onChange={e => setNewLog({ ...newLog, title: e.target.value })}
                                    />
                                </div>
                                <textarea
                                    className="w-full h-64 p-8 rounded-[40px] bg-zinc-100 dark:bg-white/5 text-sm font-medium outline-none border-none focus:ring-2 focus:ring-blue-500 resize-none custom-scrollbar"
                                    placeholder="Summarize the changes..."
                                    value={newLog.content}
                                    onChange={e => setNewLog({ ...newLog, content: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleSaveLog}
                                className="w-full h-16 bg-emerald-600 text-white rounded-3xl font-black text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20"
                            >
                                Publish v{newLog.version} Release
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
