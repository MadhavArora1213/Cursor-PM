"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

import {
    UploadCloud, Search, FileText, Headphones, CheckCircle2,
    Loader2, AlertCircle, Trash2, ShieldAlert, Cpu, Sparkles,
    FileAudio, FileIcon, File as FileGeneric, X, Play, Tag, MessageSquare
} from "lucide-react";
import { uploadResearchDocument, getResearchByWorkspace, deleteResearchItem } from "@/lib/firebase/researchService";
import { ResearchItem } from "@/types/research";

export default function ResearchIntelligencePage() {
    const { user } = useAuth();
    const { activeWorkspace } = useWorkspace();

    const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [fetchingLogs, setFetchingLogs] = useState(true);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedItem, setSelectedItem] = useState<ResearchItem | null>(null);

    const loadResearch = async () => {
        if (!activeWorkspace) return;
        setFetchingLogs(true);
        try {
            const items = await getResearchByWorkspace(activeWorkspace.id);
            setResearchItems(items);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingLogs(false);
        }
    };

    useEffect(() => {
        loadResearch();
        // Setup a polling interval to simulate live updates of the AI agent
        const interval = setInterval(() => {
            if (activeWorkspace) {
                // Background refresh without triggering loading spinners
                getResearchByWorkspace(activeWorkspace.id).then(setResearchItems).catch(() => { });
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [activeWorkspace]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activeWorkspace || !user) return;
        const file = e.target.files[0];

        setIsUploading(true);
        setUploadError("");

        try {
            await uploadResearchDocument(
                activeWorkspace.id,
                user.uid,
                file,
                "Uploaded via Research API"
            );
            await loadResearch(); // Refresh explicitly to show 'processing'
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
        } catch (error: any) {
            alert("Failed to delete item: " + error.message);
        } finally {
            setLoadingMap(prev => ({ ...prev, [item.id]: false }));
        }
    };

    // UI Variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

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
        <div className="max-w-[1200px] mx-auto pb-20">
            {/* Header */}
            <header className="mb-12 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 mb-4">
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Module 4: Intelligence</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
                    Research Hub
                </h1>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                    Upload transcripts, customer interviews, and external context. The AI telemetry engine will automatically parse sentiment and generate actionable product insights.
                </p>
            </header>

            {/* Main Action Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Drag and Drop Zone */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-white/50 dark:bg-[#0A0A0A] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-purple-500/5 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 flex flex-col items-center justify-center h-[280px] border-2 border-dashed border-zinc-300 dark:border-white/10 rounded-3xl bg-zinc-50/50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-4 text-blue-500">
                                <Loader2 className="w-10 h-10 animate-spin" />
                                <p className="text-sm font-bold animate-pulse">Ingesting Context into Matrix...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 shadow-sm border border-zinc-200 dark:border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-8 h-8 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Secure Context Upload</h3>
                                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium max-w-[250px] text-center">
                                    Drop Audio (.mp3) or Documents (.pdf, .txt). Maximum size 50MB.
                                </p>
                                <button className="mt-4 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-[13px] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                    Browse Files
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="audio/*,text/plain,application/pdf"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                    </div>
                    {uploadError && (
                        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13px] font-bold flex flex-items gap-2">
                            <AlertCircle className="w-4 h-4" /> {uploadError}
                        </div>
                    )}
                </motion.div>

                {/* Status / Metric Widget */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/50 dark:bg-[#0A0A0A] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 dark:bg-purple-500/20 blur-[50px] rounded-full" />
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-500/20">
                                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-white">Context Index</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Global Sentiment</span>
                                <span className="text-3xl font-black text-zinc-900 dark:text-white">{researchItems.length} Docs</span>
                            </div>
                            <div className="w-full flex justify-center h-[120px]">
                                {researchItems.length > 0 ? (
                                    <Doughnut
                                        data={{
                                            labels: ['Positive', 'Neutral', 'Negative', 'Mixed'],
                                            datasets: [{
                                                data: [
                                                    researchItems.filter(i => i.sentiment === 'positive').length,
                                                    researchItems.filter(i => i.sentiment === 'neutral' || !i.sentiment && i.status === 'analyzed').length,
                                                    researchItems.filter(i => i.sentiment === 'negative').length,
                                                    researchItems.filter(i => i.sentiment === 'mixed').length,
                                                ],
                                                backgroundColor: [
                                                    'rgba(16, 185, 129, 0.8)', // Emerald (Positive)
                                                    'rgba(161, 161, 170, 0.6)', // Zinc (Neutral)
                                                    'rgba(239, 68, 68, 0.8)', // Red (Negative)
                                                    'rgba(249, 115, 22, 0.8)', // Orange (Mixed)
                                                ],
                                                borderWidth: 0,
                                            }]
                                        }}
                                        options={{
                                            cutout: '75%',
                                            plugins: {
                                                legend: { display: false }
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="w-[120px] h-[120px] rounded-full border-8 border-zinc-100 dark:border-white/5 flex items-center justify-center text-zinc-400 text-xs font-bold">No Data</div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* List View */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Telemetry Database</h2>
                </div>

                {fetchingLogs && researchItems.length === 0 ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
                    </div>
                ) : researchItems.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-3xl">
                        <p className="text-zinc-500 font-medium">No telemetry context ingested yet.</p>
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid gap-4"
                    >
                        {researchItems.map(item => (
                            <motion.div
                                key={item.id}
                                variants={itemVariants}
                                onClick={() => setSelectedItem(item)}
                                className="group flex flex-col sm:flex-row gap-6 p-6 bg-white dark:bg-[#0A0A0A]/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 rounded-3xl hover:border-blue-400/50 dark:hover:border-blue-500/30 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer relative overflow-hidden"
                            >
                                {/* Left Icon */}
                                <div className="shrink-0">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                        {item.type === 'audio' ? <Headphones className="w-6 h-6 text-orange-500" /> : <FileText className="w-6 h-6 text-blue-500" />}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            {item.status === 'processing' ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider border border-blue-500/20">
                                                    <Loader2 className="w-3 h-3 animate-spin" /> Analyzing
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3 h-3" /> Ready
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2 leading-relaxed">
                                        {item.summary || "AI Analysis pending. Telemetry data is currently being parsed and vectorized by the language model..."}
                                    </p>

                                    {/* Bottom Meta */}
                                    <div className="flex items-center gap-4 text-[12px] font-medium text-zinc-400">
                                        <span>{item.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                        <span className="flex items-center gap-1">
                                            {item.type === 'audio' ? <FileAudio className="w-3.5 h-3.5" /> : <FileGeneric className="w-3.5 h-3.5" />}
                                            <span className="uppercase">{item.type}</span>
                                        </span>
                                        {item.sentiment && (
                                            <>
                                                <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                <span className={`capitalize ${item.sentiment === 'positive' ? 'text-emerald-500' :
                                                    item.sentiment === 'negative' ? 'text-red-500' : 'text-orange-500'
                                                    }`}>
                                                    Sentiment: {item.sentiment}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 sm:self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                        disabled={loadingMap[item.id]}
                                        className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        {loadingMap[item.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* AI Analysis Detail Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            className="absolute inset-0 bg-zinc-900/40 dark:bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[32px] overflow-hidden shadow-2xl shadow-zinc-900/20"
                        >
                            {/* Modal Header */}
                            <div className="shrink-0 p-6 sm:px-8 border-b border-zinc-200/50 dark:border-white/10 flex items-start justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
                                <div className="flex gap-4 items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-sm shrink-0 mt-1">
                                        {selectedItem.type === 'audio' ? <Headphones className="w-6 h-6 text-orange-500" /> : <FileText className="w-6 h-6 text-blue-500" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white pr-8">{selectedItem.title}</h2>
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[13px] font-medium text-zinc-500">
                                            <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> VADER & Llama 3 Analysis</span>
                                            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                            <span>{selectedItem.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-2.5 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full transition-colors absolute top-6 right-6"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body Container (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">

                                {/* Status & Metrics Strip */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5">
                                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            {selectedItem.status === 'processing' ? (
                                                <><Loader2 className="w-4 h-4 text-blue-500 animate-spin" /><span className="font-bold text-zinc-900 dark:text-white">Analyzing</span></>
                                            ) : (
                                                <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="font-bold text-zinc-900 dark:text-white">Calculated</span></>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5">
                                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Sentiment</p>
                                        <div className="font-bold text-zinc-900 dark:text-white capitalize">
                                            {selectedItem.sentiment || 'Pending...'}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5">
                                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Word Count</p>
                                        <div className="font-bold text-zinc-900 dark:text-white">
                                            {selectedItem.wordCount ?? '—'}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors">
                                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Source File</p>
                                        <div className="font-bold text-blue-500 flex items-center gap-1">
                                            View RAW Docs <Play className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Core Summary */}
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-500" /> Executive Summary
                                    </h3>
                                    <div className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 p-5 rounded-3xl">
                                        {selectedItem.summary || "Waiting for LLM analysis layer to complete parsing and generation..."}
                                    </div>
                                </div>

                                {/* Mocked Details depending on analysis state */}
                                {selectedItem.status === 'analyzed' && (
                                    <>
                                        <div className="grid sm:grid-cols-2 gap-8">
                                            <div>
                                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                                    <Tag className="w-5 h-5 text-emerald-500" /> Extracted Themes
                                                </h3>
                                                {selectedItem.themes && selectedItem.themes.length > 0 ? (
                                                    <ul className="space-y-3">
                                                        {selectedItem.themes.map((theme, i) => (
                                                            <li key={theme} className="flex items-start gap-3 text-[14px]">
                                                                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">{i + 1}</div>
                                                                <span className="font-medium text-zinc-700 dark:text-zinc-300">{theme}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-zinc-400 text-[14px]">No strong themes detected.</p>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                                    <MessageSquare className="w-5 h-5 text-blue-500" /> Key Verbatim Quotes
                                                </h3>
                                                <div className="space-y-4">
                                                    {selectedItem.quotes && selectedItem.quotes.length > 0 ? (
                                                        selectedItem.quotes.map((q, i) => (
                                                            <blockquote
                                                                key={i}
                                                                className={`border-l-4 pl-4 py-1 text-[14px] text-zinc-600 dark:text-zinc-400 italic ${q.sentiment === 'positive' ? 'border-emerald-500' :
                                                                        q.sentiment === 'negative' ? 'border-red-500' : 'border-blue-500'
                                                                    }`}
                                                            >
                                                                "{q.text}"
                                                            </blockquote>
                                                        ))
                                                    ) : (
                                                        <p className="text-zinc-400 text-[14px]">No notable quotes extracted.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedItem.type === 'audio' && (
                                            <div>
                                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Whisper.cpp Full Transcript (Snippet)</h3>
                                                <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 font-mono text-[13px] text-zinc-600 dark:text-zinc-400 max-h-[200px] overflow-y-auto w-full">
                                                    [00:00:00.000 --&gt; 00:00:05.420] Hello, yes, so my initial thoughts on the platform are overall very positive.<br /><br />
                                                    [00:00:05.420 --&gt; 00:00:12.100] I actually was using your competitor last week, but I find the way you handle context window tracking to be significantly faster.<br /><br />
                                                    [00:00:12.100 --&gt; 00:00:18.880] The only real drawback I consistently ran into was trying to share a live link with a colleague who didn't have an account...
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="shrink-0 p-6 bg-zinc-50 dark:bg-white/[0.02] border-t border-zinc-200/50 dark:border-white/10 flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="px-6 py-2.5 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Close Report
                                </button>
                                <button className="px-6 py-2.5 rounded-xl font-bold bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity shadow-lg">
                                    Turn into Strategy ➔
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
