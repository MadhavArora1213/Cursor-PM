"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

import {
    UploadCloud, Search, FileText, Headphones, CheckCircle2,
    Loader2, AlertCircle, Trash2, ShieldAlert, Cpu, Sparkles,
    FileAudio, FileIcon, File as FileGeneric, X, Play, Tag, MessageSquare,
    Send, Bot, User, TrendingUp, AlertTriangle, Zap, BarChart3,
    Brain, Target, ChevronDown, ChevronUp, Users, Lightbulb, Filter, RefreshCcw
} from "lucide-react";
import Link from 'next/link';
import { uploadResearchDocument, getResearchByWorkspace, deleteResearchItem } from "@/lib/firebase/researchService";
import { ResearchItem } from "@/types/research";
import { useRouter } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Types ──
interface ChatMessage { role: 'user' | 'assistant'; content: string; sources?: { id: string; title: string }[]; }
interface InsightData {
    painPoints: { title: string; severity: string; mentions: number; description: string }[];
    featureOpportunities: { title: string; confidence: number; description: string; suggestedSolution: string }[];
    customerPersonas: { segment: string; need: string; pain: string; opportunity: string }[];
    sentimentBreakdown: { positive: number; neutral: number; negative: number; mixed: number };
    topThemes: { theme: string; count: number; trend: string }[];
    riskFactors: { risk: string; impact: string; recommendation: string }[];
}

export default function ResearchIntelligencePage() {
    const { user } = useAuth();
    const { activeWorkspace } = useWorkspace();
    const router = useRouter();

    const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [fetchingLogs, setFetchingLogs] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedItem, setSelectedItem] = useState<ResearchItem | null>(null);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

    // AI Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Insights State
    const [insights, setInsights] = useState<InsightData | null>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [showInsights, setShowInsights] = useState(false);
    const [activeTab, setActiveTab] = useState<'documents' | 'insights' | 'chat'>('documents');
    const [showDocSelector, setShowDocSelector] = useState(false);

    const toggleDocSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const clearSelection = () => setSelectedDocIds([]);
    const selectAll = () => setSelectedDocIds(researchItems.map(i => i.id));

    const loadResearch = async () => {
        if (!activeWorkspace) return;
        setFetchingLogs(true);
        try {
            const items = await getResearchByWorkspace(activeWorkspace.id);
            setResearchItems(items);
        } catch (error) { console.error(error); }
        finally { setFetchingLogs(false); }
    };

    useEffect(() => {
        loadResearch();
        const interval = setInterval(() => {
            if (activeWorkspace) {
                getResearchByWorkspace(activeWorkspace.id).then(setResearchItems).catch(() => { });
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [activeWorkspace]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activeWorkspace || !user) return;
        const file = e.target.files[0];
        setIsUploading(true);
        setUploadError("");
        try {
            await uploadResearchDocument(activeWorkspace.id, user.uid, file, "Uploaded via Research API");
            await loadResearch();
        } catch (error: any) {
            setUploadError(error.message || "Failed to upload context.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (item: ResearchItem) => {
        if (!confirm(`Are you sure you want to permanently delete this telemetry data?`)) return;
        setLoadingMap(prev => ({ ...prev, [item.id]: true }));
        try {
            await deleteResearchItem(item.id, item.fileUrl);
            await loadResearch();
        } catch (error: any) { alert("Failed to delete item: " + error.message); }
        finally { setLoadingMap(prev => ({ ...prev, [item.id]: false })); }
    };

    const handleReanalyze = async (item: ResearchItem) => {
        setLoadingMap(prev => ({ ...prev, [item.id]: true }));
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: item.id,
                    workspaceId: activeWorkspace?.id,
                    localFilePath: item.fileUrl,
                    fileName: item.title,
                }),
            });
            const result = await res.json();
            if (result.success) {
                alert("Deep analysis restarted for: " + item.title);
                loadResearch();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            alert("Failed to re-analyze: " + error.message);
        } finally {
            setLoadingMap(prev => ({ ...prev, [item.id]: false }));
        }
    };

    // ── AI Chat Handler ──
    const handleChatSend = async () => {
        if (!chatInput.trim() || chatLoading) return;
        const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput("");
        setChatLoading(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMsg.content,
                    workspaceId: activeWorkspace?.id,
                    chatHistory: chatMessages.slice(-6),
                    selectedDocIds: selectedDocIds,
                }),
            });
            const data = await res.json();
            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: data.answer || 'Sorry, I could not process your question.',
                sources: data.sources?.filter((s: any) => s.distance < 1.5) || [],
            };
            setChatMessages(prev => [...prev, assistantMsg]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
        } finally { setChatLoading(false); }
    };

    // ── Insights Generator ──
    const handleGenerateInsights = async () => {
        if (!activeWorkspace || insightsLoading) return;
        setInsightsLoading(true);
        try {
            const res = await fetch('/api/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId: activeWorkspace.id }),
            });
            const data = await res.json();
            if (data.success && data.insights) {
                setInsights(data.insights);
                setActiveTab('insights');
            }
        } catch (err) { console.error('Insights failed:', err); }
        finally { setInsightsLoading(false); }
    };

    const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

    const analyzedCount = researchItems.filter(i => i.status === 'analyzed').length;

    if (!activeWorkspace) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <ShieldAlert className="w-12 h-12 text-zinc-400 mx-auto opacity-50" />
                    <h2 className="text-xl font-bold text-zinc-500">No Environment Active</h2>
                    <p className="text-sm text-zinc-400">Deploy or select a workspace to access AI Intelligence.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1500px] mx-auto pb-10 px-4 sm:px-6">
            {/* Header */}
            <header className="mb-8 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 mb-4">
                    <Brain className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Module 4: AI Research Intelligence</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3">
                    Research Hub
                </h1>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                    Upload research, ask AI questions, and generate product intelligence. Your AI-powered research analyst.
                </p>
            </header>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 mb-8 p-1.5 bg-zinc-100 dark:bg-white/5 rounded-2xl w-fit border border-zinc-200/50 dark:border-white/5">
                {[
                    { id: 'documents' as const, label: 'Documents', icon: FileText, count: researchItems.length },
                    { id: 'insights' as const, label: 'AI Insights', icon: TrendingUp, count: insights ? 1 : 0 },
                    { id: 'chat' as const, label: 'Research Chat', icon: MessageSquare },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-white/10'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold">{tab.count}</span>
                        )}
                    </button>
                ))}

                {selectedDocIds.length > 0 && activeTab !== 'chat' && (
                    <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => setActiveTab('chat')}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[12px] font-bold shadow-lg hover:bg-blue-700 transition-all"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat with {selectedDocIds.length} Selected
                    </motion.button>
                )}
            </div>

            {/* ═══════════════ DOCUMENTS TAB ═══════════════ */}
            {activeTab === 'documents' && (
                <>
                    {/* Upload + Metrics Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                        {/* Upload Zone */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="lg:col-span-2 bg-white/50 dark:bg-[#0A0A0A] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-[28px] p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-purple-500/5 opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex flex-col items-center justify-center h-[220px] border-2 border-dashed border-zinc-300 dark:border-white/10 rounded-2xl bg-zinc-50/50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}>
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-3 text-blue-500">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <p className="text-sm font-bold animate-pulse">Ingesting into AI Pipeline...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 shadow-sm border border-zinc-200 dark:border-white/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                            <UploadCloud className="w-7 h-7 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Upload Research Documents</h3>
                                        <p className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium max-w-[280px] text-center">
                                            PDF, TXT, Audio (.mp3, .wav). Supports interviews, surveys, feedback docs.
                                        </p>
                                        <button className="mt-2 px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-[12px] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all">
                                            Browse Files
                                        </button>
                                    </div>
                                )}
                                <input type="file" className="hidden" ref={fileInputRef}
                                    accept="audio/*,text/plain,application/pdf,.csv,.docx"
                                    onChange={handleFileUpload} disabled={isUploading} />
                            </div>
                            {uploadError && (
                                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] font-bold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> {uploadError}
                                </div>
                            )}
                        </motion.div>

                        {/* Stats Widget */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                            className="bg-white/50 dark:bg-[#0A0A0A] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-[28px] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/20 blur-[40px] rounded-full" />
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-500/20">
                                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Intelligence Index</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Global Status</span>
                                        <span className="text-2xl font-black text-zinc-900 dark:text-white">{researchItems.length}</span>
                                    </div>
                                    <div className="w-full flex justify-center h-[100px]">
                                        {researchItems.length > 0 ? (
                                            <Doughnut
                                                data={{
                                                    labels: ['Positive', 'Neutral', 'Negative', 'Mixed'],
                                                    datasets: [{
                                                        data: [
                                                            researchItems.filter(i => i.sentiment === 'positive').length,
                                                            researchItems.filter(i => i.sentiment === 'neutral' || (!i.sentiment && i.status === 'analyzed')).length,
                                                            researchItems.filter(i => i.sentiment === 'negative').length,
                                                            researchItems.filter(i => i.sentiment === 'mixed').length,
                                                        ],
                                                        backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(161,161,170,0.6)', 'rgba(239,68,68,0.8)', 'rgba(249,115,22,0.8)'],
                                                        borderWidth: 0,
                                                    }]
                                                }}
                                                options={{ cutout: '75%', plugins: { legend: { display: false } } }}
                                            />
                                        ) : (
                                            <div className="w-[100px] h-[100px] rounded-full border-8 border-zinc-100 dark:border-white/5 flex items-center justify-center text-zinc-400 text-xs font-bold">No Data</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Quick Actions */}
                            <div className="mt-4 flex gap-2">
                                <button onClick={handleGenerateInsights} disabled={analyzedCount === 0 || insightsLoading}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl text-[11px] font-bold border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-40">
                                    {insightsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                                    Generate Insights
                                </button>
                                <button onClick={() => setActiveTab('chat')}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-[11px] font-bold border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                                    <MessageSquare className="w-3 h-3" /> Ask AI
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Document List Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-white/[0.02] p-4 rounded-[20px] border border-zinc-200/50 dark:border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <Search className="w-5 h-5 text-zinc-400" />
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Research Database</h2>
                            <span className="text-[12px] font-bold text-zinc-400">{analyzedCount}/{researchItems.length} analyzed</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {researchItems.length > 0 && (
                                <>
                                    <button onClick={selectAll} className="text-[11px] font-bold text-zinc-500 hover:text-blue-500 transition-colors px-2 py-1">Select All</button>
                                    <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-800" />
                                    <button onClick={clearSelection} className="text-[11px] font-bold text-zinc-500 hover:text-red-500 transition-colors px-2 py-1">Clear</button>
                                </>
                            )}
                        </div>
                    </div>

                    {fetchingLogs && researchItems.length === 0 ? (
                        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 text-zinc-400 animate-spin" /></div>
                    ) : researchItems.length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-2xl">
                            <p className="text-zinc-500 font-medium">No research uploaded yet.</p>
                        </div>
                    ) : (
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-3">
                            {researchItems.map(item => (
                                <motion.div key={item.id} variants={itemVariants}
                                    onClick={() => setSelectedItem(item)}
                                    className={`group flex flex-col sm:flex-row gap-4 p-5 bg-white dark:bg-[#0A0A0A]/80 backdrop-blur-md border rounded-2xl transition-all shadow-sm hover:shadow-lg cursor-pointer relative overflow-hidden ${selectedDocIds.includes(item.id)
                                        ? 'border-blue-500 bg-blue-500/[0.02] dark:bg-blue-500/[0.05]'
                                        : 'border-zinc-200/80 dark:border-white/10 hover:border-blue-400/50 dark:hover:border-blue-500/30'
                                        }`}>

                                    {/* Selection Checkbox Overlay for hover/selected state */}
                                    <div className="shrink-0 flex items-center">
                                        <div
                                            onClick={(e) => toggleDocSelection(item.id, e)}
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedDocIds.includes(item.id)
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'border-zinc-300 dark:border-white/10 group-hover:border-blue-400/50'
                                                }`}
                                        >
                                            {selectedDocIds.includes(item.id) && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                    </div>

                                    <div className="shrink-0">
                                        <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                            {item.type === 'audio' ? <Headphones className="w-5 h-5 text-orange-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                            <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">{item.title}</h3>
                                            <div className="flex items-center gap-2">
                                                {item.status === 'processing' ? (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                                                        <Loader2 className="w-3 h-3 animate-spin" /> Analyzing
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" /> Ready
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2 leading-relaxed">
                                            {item.summary ? item.summary.replace(/[#*`_~>-]/g, '').replace(/\n+/g, ' ').trim() : "AI analysis pending..."}
                                        </p>
                                        <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-400">
                                            <span>{item.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                            <span className="uppercase">{item.type}</span>
                                            {item.sentiment && (
                                                <>
                                                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                    <span className={`capitalize ${item.sentiment === 'positive' ? 'text-emerald-500' : item.sentiment === 'negative' ? 'text-red-500' : 'text-orange-500'}`}>
                                                        {item.sentiment}
                                                    </span>
                                                </>
                                            )}
                                            {item.themes && item.themes.length > 0 && (
                                                <>
                                                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                    <span className="text-blue-500">{item.themes.length} themes</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute top-3 right-3 sm:relative sm:top-0 sm:right-0 sm:self-center flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleReanalyze(item); }} disabled={loadingMap[item.id]}
                                            title="Re-analyze document"
                                            className="p-2.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all disabled:opacity-50">
                                            <RefreshCcw className={`w-4 h-4 ${loadingMap[item.id] ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} disabled={loadingMap[item.id]}
                                            className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50">
                                            {loadingMap[item.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </>
            )}

            {/* ═══════════════ AI INSIGHTS TAB ═══════════════ */}
            {activeTab === 'insights' && (
                <div className="space-y-6">
                    {!insights ? (
                        <div className="py-16 text-center border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-2xl space-y-4">
                            <TrendingUp className="w-10 h-10 text-zinc-300 mx-auto" />
                            <p className="text-lg font-bold text-zinc-400">No insights generated yet</p>
                            <p className="text-[13px] text-zinc-400 max-w-md mx-auto">Analyze at least one research document, then generate insights.</p>
                            <button onClick={handleGenerateInsights} disabled={analyzedCount === 0 || insightsLoading}
                                className="mt-4 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-[13px] rounded-2xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-40">
                                {insightsLoading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Analyzing...</> : <><Sparkles className="w-4 h-4 inline mr-2" />Generate AI Insights</>}
                            </button>
                        </div>
                    ) : (
                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
                            {/* Sentiment Overview */}
                            <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Positive', value: insights.sentimentBreakdown.positive, color: 'emerald', icon: CheckCircle2 },
                                    { label: 'Neutral', value: insights.sentimentBreakdown.neutral, color: 'zinc', icon: FileText },
                                    { label: 'Negative', value: insights.sentimentBreakdown.negative, color: 'red', icon: AlertTriangle },
                                    { label: 'Mixed', value: insights.sentimentBreakdown.mixed, color: 'orange', icon: Zap },
                                ].map(s => (
                                    <div key={s.label} className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200/50 dark:border-white/5 shadow-sm">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{s.label}</p>
                                        <div className="flex items-center gap-2">
                                            <s.icon className={`w-5 h-5 text-${s.color}-500`} />
                                            <span className="text-2xl font-black text-zinc-900 dark:text-white">{s.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Pain Points */}
                            {insights.painPoints.length > 0 && (
                                <motion.div variants={itemVariants} className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[24px] p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-500" /> Top Pain Points
                                    </h3>
                                    <div className="space-y-3">
                                        {insights.painPoints.map((pp, i) => (
                                            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10">
                                                <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-[11px] shrink-0">{i + 1}</div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-zinc-900 dark:text-white text-[14px]">{pp.title}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${pp.severity === 'high' ? 'bg-red-100 text-red-600' : pp.severity === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-zinc-100 text-zinc-500'}`}>{pp.severity}</span>
                                                    </div>
                                                    <p className="text-[13px] text-zinc-500">{pp.description}</p>
                                                </div>
                                                <span className="text-[12px] font-bold text-red-500">{pp.mentions} mentions</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Feature Opportunities */}
                            {insights.featureOpportunities.length > 0 && (
                                <motion.div variants={itemVariants} className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[24px] p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Lightbulb className="w-5 h-5 text-amber-500" /> Feature Opportunities
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {insights.featureOpportunities.map((f, i) => (
                                            <div key={i} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-zinc-900 dark:text-white text-[14px]">{f.title}</span>
                                                    <span className="text-[11px] font-bold text-amber-600">{f.confidence}% confidence</span>
                                                </div>
                                                <p className="text-[12px] text-zinc-500 mb-2">{f.description}</p>
                                                <div className="w-full bg-zinc-200 dark:bg-white/10 rounded-full h-1.5">
                                                    <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${f.confidence}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Top Themes Bar Chart */}
                            {insights.topThemes.length > 0 && (
                                <motion.div variants={itemVariants} className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[24px] p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-blue-500" /> Theme Distribution
                                    </h3>
                                    <div className="h-[250px]">
                                        <Bar
                                            data={{
                                                labels: insights.topThemes.map(t => t.theme.length > 20 ? t.theme.substring(0, 20) + '...' : t.theme),
                                                datasets: [{
                                                    label: 'Mentions',
                                                    data: insights.topThemes.map(t => t.count),
                                                    backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(16,185,129,0.7)', 'rgba(249,115,22,0.7)', 'rgba(239,68,68,0.7)', 'rgba(168,85,247,0.7)', 'rgba(20,184,166,0.7)', 'rgba(244,63,94,0.7)', 'rgba(234,179,8,0.7)'],
                                                    borderRadius: 8,
                                                    borderSkipped: false,
                                                }]
                                            }}
                                            options={{
                                                responsive: true, maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                                                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' as const } } }
                                                }
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Customer Personas */}
                            {insights.customerPersonas && insights.customerPersonas.length > 0 && (
                                <motion.div variants={itemVariants} className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[24px] p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-500" /> Customer Personas
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {insights.customerPersonas.map((p, i) => (
                                            <div key={i} className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                                                <h4 className="font-bold text-zinc-900 dark:text-white text-[14px] mb-2">{p.segment}</h4>
                                                <div className="space-y-1 text-[12px]">
                                                    <p><span className="font-bold text-emerald-600">Need:</span> <span className="text-zinc-500">{p.need}</span></p>
                                                    <p><span className="font-bold text-red-600">Pain:</span> <span className="text-zinc-500">{p.pain}</span></p>
                                                    <p><span className="font-bold text-blue-600">Opportunity:</span> <span className="text-zinc-500">{p.opportunity}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Risk Factors */}
                            {insights.riskFactors && insights.riskFactors.length > 0 && (
                                <motion.div variants={itemVariants} className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[24px] p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-orange-500" /> Risk Analysis
                                    </h3>
                                    <div className="space-y-3">
                                        {insights.riskFactors.map((r, i) => (
                                            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10">
                                                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${r.impact === 'high' ? 'text-red-500' : r.impact === 'medium' ? 'text-orange-500' : 'text-zinc-400'}`} />
                                                <div>
                                                    <p className="font-bold text-zinc-900 dark:text-white text-[14px]">{r.risk}</p>
                                                    <p className="text-[12px] text-emerald-600 mt-1">→ {r.recommendation}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            <button onClick={handleGenerateInsights} disabled={insightsLoading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 font-bold text-[12px] rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all">
                                {insightsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Regenerate Insights
                            </button>
                        </motion.div>
                    )}
                </div>
            )
            }

            {/* ═══════════════ AI CHAT TAB ═══════════════ */}
            {
                activeTab === 'chat' && (
                    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[32px] overflow-hidden shadow-2xl transition-all">
                        {/* Chat Header */}
                        <div className="shrink-0 px-6 py-4 border-b border-zinc-200/50 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center border border-blue-200 dark:border-blue-500/20">
                                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white text-sm">AI Research Analyst</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] text-zinc-500">Powered by RAG + Qwen</p>
                                        <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                        <button
                                            onClick={() => setShowDocSelector(true)}
                                            className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-md transition-all ${selectedDocIds.length > 0
                                                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                : 'text-zinc-500 hover:text-blue-500'
                                                }`}
                                        >
                                            <Filter className="w-3 h-3" />
                                            {selectedDocIds.length > 0 ? `Focusing on ${selectedDocIds.length} docs` : 'Filter Context'}
                                        </button>
                                        {selectedDocIds.length > 0 && (
                                            <button onClick={clearSelection} className="text-[10px] font-bold text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-tighter">Clear</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {chatMessages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                                        <Brain className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Ask About Your Research</h3>
                                        <p className="text-[13px] text-zinc-500 max-w-md mb-4">I search through all your uploaded documents and provide insights based on real data.</p>
                                        <button
                                            onClick={() => setShowDocSelector(true)}
                                            className="mx-auto flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-[12px] font-bold border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Select Specific Documents to Question
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {[
                                            "What are the biggest user complaints?",
                                            "Summarize onboarding feedback",
                                            "What features do users request most?",
                                            "Find patterns in customer feedback",
                                        ].map(prompt => (
                                            <button key={prompt} onClick={() => { setChatInput(prompt); }}
                                                className="px-3 py-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all">
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                            <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] rounded-[24px] px-6 py-4 shadow-sm break-words ${msg.role === 'user'
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                                        : 'bg-zinc-100 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-white/5'
                                        }`}>
                                        {msg.role === 'assistant' ? (
                                            <div className="text-[14px] leading-relaxed dark:text-zinc-200">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0" {...props} />,
                                                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-4 mb-2 first:mt-0" {...props} />,
                                                        h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-3 mb-1 first:mt-0" {...props} />,
                                                        p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-bold text-blue-600 dark:text-blue-400" {...props} />,
                                                        code: ({ node, ...props }) => <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[12px] font-mono" {...props} />,
                                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 py-1 italic my-3" {...props} />,
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="text-[14px] leading-relaxed">{msg.content}</p>
                                        )}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-zinc-200/30 dark:border-white/10">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Sources</p>
                                                {msg.sources.map((s, j) => (
                                                    <span key={j} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold">{s.title}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                            <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {chatLoading && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="bg-zinc-100 dark:bg-white/5 rounded-[24px] px-6 py-4 border border-zinc-200/50 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-[13px] text-zinc-500">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing research insights...
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="shrink-0 px-6 py-4 border-t border-zinc-200/50 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
                            <div className="flex gap-3">
                                <input
                                    type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                                    placeholder="Ask about your research..."
                                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-[13px] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                                />
                                <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()}
                                    className="px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[13px] hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2">
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ═══════ DETAIL MODAL ═══════ */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            className="absolute inset-0 bg-zinc-900/40 dark:bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="shrink-0 p-6 border-b border-zinc-200/50 dark:border-white/10 flex items-start justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
                                <div className="flex gap-4 items-start">
                                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-sm shrink-0">
                                        {selectedItem.type === 'audio' ? <Headphones className="w-5 h-5 text-orange-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white pr-8">{selectedItem.title}</h2>
                                        <div className="flex items-center gap-3 mt-1 text-[12px] font-medium text-zinc-500">
                                            <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {selectedItem.aiMeta?.summarySource === 'ollama' ? `Qwen (${selectedItem.aiMeta.ollamaModel || 'qwen2.5'})` : 'VADER + Extractive'}</span>
                                            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                            <span>{selectedItem.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            {selectedItem.vectorized && (<><div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" /><span className="text-blue-500">ChromaDB Indexed</span></>)}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Status', value: selectedItem.status === 'processing' ? 'Analyzing' : 'Complete', icon: selectedItem.status === 'processing' ? Loader2 : CheckCircle2, color: selectedItem.status === 'processing' ? 'blue' : 'emerald' },
                                        { label: 'Sentiment', value: selectedItem.sentiment || 'Pending', icon: Tag, color: 'purple' },
                                        { label: 'Words', value: selectedItem.wordCount ?? '—', icon: FileText, color: 'zinc' },
                                        { label: 'Themes', value: selectedItem.themes?.length || 0, icon: BarChart3, color: 'blue' },
                                    ].map(m => (
                                        <div key={m.label} className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{m.label}</p>
                                            <span className="font-bold text-zinc-900 dark:text-white capitalize text-sm">{m.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary */}
                                <div>
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-500" /> Executive Summary
                                    </h3>
                                    <div className="text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300 bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 p-4 rounded-2xl overflow-hidden">
                                        {selectedItem.summary ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}
                                                components={{
                                                    h1: ({ ...props }) => <h1 className="text-xl font-black mt-4 mb-3 text-zinc-900 dark:text-white" {...props} />,
                                                    h2: ({ ...props }) => <h2 className="text-lg font-bold mt-4 mb-2 text-zinc-900 dark:text-white" {...props} />,
                                                    h3: ({ ...props }) => <h3 className="text-base font-bold mt-3 mb-1 text-zinc-900 dark:text-white" {...props} />,
                                                    strong: ({ ...props }) => <strong className="font-extrabold text-zinc-900 dark:text-white" {...props} />,
                                                    ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1 marker:text-purple-500" {...props} />,
                                                    ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                                                    li: ({ ...props }) => <li className="pl-1" {...props} />,
                                                    p: ({ ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                                    blockquote: ({ ...props }) => <blockquote className="border-l-4 border-purple-500 pl-3 py-1 my-3 text-zinc-600 dark:text-zinc-400 italic bg-purple-500/5 rounded-r-lg" {...props} />,
                                                }}>
                                                {selectedItem.summary}
                                            </ReactMarkdown>
                                        ) : "Waiting for LLM analysis..."}
                                    </div>
                                </div>

                                {/* Themes + Quotes */}
                                {selectedItem.status === 'analyzed' && (
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-emerald-500" /> Extracted Themes
                                            </h3>
                                            {selectedItem.themes && selectedItem.themes.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {selectedItem.themes.map((theme, i) => (
                                                        <li key={theme} className="flex items-start gap-2 text-[13px]">
                                                            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">{i + 1}</div>
                                                            <span className="font-medium text-zinc-700 dark:text-zinc-300">{theme}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : <p className="text-zinc-400 text-[13px]">No themes detected.</p>}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-blue-500" /> Key Quotes
                                            </h3>
                                            <div className="space-y-3">
                                                {selectedItem.quotes && selectedItem.quotes.length > 0 ? (
                                                    selectedItem.quotes.map((q, i) => (
                                                        <blockquote key={i} className={`border-l-4 pl-3 py-1 text-[13px] text-zinc-600 dark:text-zinc-400 italic ${q.sentiment === 'positive' ? 'border-emerald-500' : q.sentiment === 'negative' ? 'border-red-500' : 'border-blue-500'}`}>
                                                            &ldquo;{q.text}&rdquo;
                                                        </blockquote>
                                                    ))
                                                ) : <p className="text-zinc-400 text-[13px]">No quotes extracted.</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="shrink-0 p-5 bg-zinc-50 dark:bg-white/[0.02] border-t border-zinc-200/50 dark:border-white/10 flex justify-between items-center">
                                <button onClick={() => handleReanalyze(selectedItem)} disabled={loadingMap[selectedItem.id]}
                                    className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-blue-500 font-bold text-[12px] transition-all">
                                    <RefreshCcw className={`w-3.5 h-3.5 ${loadingMap[selectedItem.id] ? 'animate-spin' : ''}`} />
                                    {loadingMap[selectedItem.id] ? 'Analyzing...' : 'Refresh AI Data'}
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={() => setSelectedItem(null)}
                                        className="px-5 py-2.5 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors text-[13px]">
                                        Close
                                    </button>
                                    <Link href={`/dashboard/strategy?itemId=${selectedItem.id}`} onClick={() => setSelectedItem(null)}
                                        className="px-5 py-2.5 rounded-xl font-bold bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center text-[13px]">
                                        Turn into Strategy ➔
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════ DOCUMENT SELECTION MODAL (FROM CHAT) ═══════ */}
            <AnimatePresence>
                {showDocSelector && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowDocSelector(false)}
                            className="absolute inset-0 bg-zinc-900/40 dark:bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
                            <div className="shrink-0 p-6 border-b border-zinc-200/50 dark:border-white/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Select Documents</h3>
                                    <p className="text-[11px] text-zinc-500">Pick documents for the AI to analyze</p>
                                </div>
                                <button onClick={() => setShowDocSelector(false)} className="p-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 rounded-full">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <button onClick={selectAll} className="text-[11px] font-bold text-blue-500">Select All</button>
                                    <button onClick={clearSelection} className="text-[11px] font-bold text-zinc-400 hover:text-red-500">Clear</button>
                                </div>
                                {researchItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleDocSelection(item.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedDocIds.includes(item.id)
                                            ? 'bg-blue-500/5 border-blue-500/50'
                                            : 'border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedDocIds.includes(item.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-zinc-300 dark:border-white/10'
                                            }`}>
                                            {selectedDocIds.includes(item.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 truncate">{item.title}</p>
                                            <p className="text-[10px] text-zinc-500 uppercase">{item.type} • {item.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="shrink-0 p-4 border-t border-zinc-200/50 dark:border-white/10 bg-zinc-50 dark:bg-white/5">
                                <button
                                    onClick={() => setShowDocSelector(false)}
                                    className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl text-[13px] shadow-lg"
                                >
                                    Finish Selection ({selectedDocIds.length})
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
