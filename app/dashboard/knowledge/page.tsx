"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Brain, Database, RefreshCcw, FileText,
    Target, FlaskConical, Lightbulb, ChevronRight,
    MessageSquare, Send, Sparkles, AlertCircle,
    CheckCircle2, Clock, Filter, Layers
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface KnowledgeItem {
    id: string;
    text: string;
    distance: number;
    metadata: {
        id: string;
        title: string;
        type: 'research' | 'experiment' | 'feature' | 'okr' | 'note';
        workspaceId: string;
        indexedAt: string;
        [key: string]: any;
    };
}

export default function KnowledgeManagementPage() {
    const { activeWorkspace } = useWorkspace();
    const { user } = useAuth();

    // Search & Chat States
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<KnowledgeItem[]>([]);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);

    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [syncStats, setSyncStats] = useState({ total: 0, items: 0 });

    // UI States
    const [activeFilter, setActiveFilter] = useState<'all' | 'research' | 'strategy' | 'validation'>('all');

    const handleSync = async () => {
        if (!activeWorkspace || isSyncing) return;
        setIsSyncing(true);
        try {
            const res = await fetch('/api/knowledge/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId: activeWorkspace.id }),
            });
            const data = await res.json();
            if (data.success) {
                setLastSynced(new Date().toISOString());
                // After sync, refresh view or count if needed
            }
        } catch (err) {
            console.error('Sync failed:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim() || !activeWorkspace || isSearching) return;

        setIsSearching(true);
        setAiAnswer(null);
        try {
            const res = await fetch('/api/knowledge/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: searchQuery,
                    workspaceId: activeWorkspace.id
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSearchResults(data.results || []);
                setAiAnswer(data.answer);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'research': return <Search className="w-4 h-4 text-blue-500" />;
            case 'experiment': return <FlaskConical className="w-4 h-4 text-orange-500" />;
            case 'feature': return <Lightbulb className="w-4 h-4 text-amber-500" />;
            case 'okr': return <Target className="w-4 h-4 text-emerald-500" />;
            default: return <FileText className="w-4 h-4 text-zinc-400" />;
        }
    };

    if (!activeWorkspace) {
        return (
            <div className="h-[80vh] flex items-center justify-center text-zinc-500 font-bold">
                Select a workspace to enter Knowledge Management.
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                        <Database className="w-3 h-3" /> Workspace Brain
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Knowledge Hub</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                        AI-powered semantic search across your entire product surface area — research, strategy, and experiments.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-black/10 dark:shadow-white/5"
                    >
                        {isSyncing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        {isSyncing ? 'Indexing Workspace...' : 'Sync knowledge'}
                    </button>
                    {lastSynced && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                            <Clock className="w-3 h-3" /> Last Synced: {new Date(lastSynced).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </header>

            {/* Principal Search Area */}
            <section className="relative">
                <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] rounded-full -z-10" />
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2">
                        <Brain className={`w-6 h-6 transition-colors ${isSearching ? 'text-emerald-500 animate-pulse' : 'text-zinc-400 group-focus-within:text-emerald-500'}`} />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ask anything... 'What are our biggest risks?' or 'Find the Q4 roadmap items'"
                        className="w-full h-20 pl-16 pr-32 bg-white dark:bg-[#0A0A0A] border-2 border-zinc-100 dark:border-white/5 rounded-[32px] text-lg font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 outline-none transition-all shadow-2xl shadow-black/5 dark:shadow-white/2 placeholder:text-zinc-400"
                    />
                    <button
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 px-8 bg-emerald-500 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
                    >
                        Query <Send className="w-4 h-4" />
                    </button>
                </form>
            </section>

            {/* Results & AI Insights Panel */}
            <AnimatePresence mode="wait">
                {(isSearching || aiAnswer || searchResults.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        {/* AI Synthesized Answer */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="p-8 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] -z-0">
                                    <Sparkles className="w-32 h-32" />
                                </div>
                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center gap-2 text-emerald-500">
                                        <Sparkles className="w-5 h-5" />
                                        <h3 className="text-sm font-black uppercase tracking-widest">AI Intelligence Response</h3>
                                    </div>
                                    <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                                        {isSearching ? (
                                            <div className="space-y-3">
                                                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full w-3/4 animate-pulse" />
                                                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full w-1/2 animate-pulse" />
                                                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full w-2/3 animate-pulse" />
                                            </div>
                                        ) : (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {aiAnswer || "Thinking..."}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Semantic Sources */}
                            <div className="space-y-4">
                                <h4 className="px-4 text-[11px] font-black uppercase tracking-widest text-zinc-400">Contextual Sources ({searchResults.length})</h4>
                                <div className="grid gap-3">
                                    {searchResults.map((item, i) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="p-5 rounded-3xl bg-white dark:bg-[#0A0A0A] border border-zinc-100 dark:border-white/5 hover:border-emerald-500/30 transition-all flex gap-4 group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-100 dark:border-white/5 group-hover:scale-110 transition-transform">
                                                {getTypeIcon(item.metadata.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h5 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.metadata.title}</h5>
                                                    <span className="text-[10px] font-bold text-zinc-400 capitalize">{item.metadata.type}</span>
                                                </div>
                                                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 line-clamp-1 italic">
                                                    "{item.text.substring(0, 150)}..."
                                                </p>
                                            </div>
                                            <div className="flex items-center text-zinc-300 group-hover:text-emerald-500 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Knowledge Stats/Explorer Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="p-6 rounded-[32px] bg-zinc-900 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full" />
                                <h3 className="text-lg font-bold mb-1">Knowledge Coverage</h3>
                                <p className="text-[12px] text-zinc-400 mb-6">Cross-module indexing status</p>

                                <div className="space-y-4">
                                    {[
                                        { label: 'Research Docs', color: '#3b82f6', percent: 85 },
                                        { label: 'Feature Spec', color: '#f59e0b', percent: 62 },
                                        { label: 'Experiments', color: '#f97316', percent: 45 },
                                        { label: 'Strategic OKRs', color: '#10b981', percent: 90 },
                                    ].map(stat => (
                                        <div key={stat.label} className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span>{stat.label}</span>
                                                <span className="opacity-60">{stat.percent}%</span>
                                            </div>
                                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{ width: `${stat.percent}%`, backgroundColor: stat.color }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 space-y-4">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-emerald-500" /> Recent Indices
                                </h3>
                                <div className="space-y-4 pt-2">
                                    {searchResults.slice(0, 3).map((item, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.metadata.title}</div>
                                                <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{item.metadata.type}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State / Dashboard View */}
            {!searchResults.length && !isSearching && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { title: 'Semantic Bridge', icon: Layers, desc: 'Connects unstructured research to strategic backlogs.', color: 'blue' },
                        { title: 'Global Q&A', icon: MessageSquare, desc: 'Ask complex questions across your entire documentation.', color: 'emerald' },
                        { title: 'Realtime Sync', icon: RefreshCcw, desc: 'Every feature edit and experiment is indexed instantly.', color: 'orange' },
                        { title: 'AI Synthesis', icon: Brain, desc: 'Summarizes patterns across multiple data types.', color: 'purple' },
                    ].map((card, i) => (
                        <div key={i} className="p-8 rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 hover:border-emerald-500/20 transition-all">
                            <div className={`w-12 h-12 rounded-2xl bg-${card.color}-500/10 flex items-center justify-center mb-6 text-${card.color}-500`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold mb-2">{card.title}</h3>
                            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">{card.desc}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
