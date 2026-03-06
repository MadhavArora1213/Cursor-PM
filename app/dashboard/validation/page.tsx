"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    FlaskConical, Target, Beaker, CheckCircle2,
    XCircle, PlayCircle, PauseCircle, Plus,
    Loader2, Sparkles, ChevronDown, BarChart2,
    Calendar, Users, AlertTriangle, ArrowRight,
    Brain, ClipboardList, Info, Trash2, Clock
} from "lucide-react";
import {
    getExperimentsByWorkspace,
    createExperiment,
    updateExperiment,
    deleteExperiment,
    analyzeExperimentResults
} from "@/lib/firebase/validationService";
import { Experiment, Metric } from "@/types/validation";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ValidationCenterPage() {
    const { activeWorkspace } = useWorkspace();
    const { user } = useAuth();

    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // New Experiment Form
    const [title, setTitle] = useState("");
    const [hypothesis, setHypothesis] = useState("");
    const [design, setDesign] = useState("");
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (activeWorkspace) {
            loadExperiments();
        } else {
            setLoading(false);
        }
    }, [activeWorkspace]);

    const loadExperiments = async () => {
        setLoading(true);
        try {
            const data = await getExperimentsByWorkspace(activeWorkspace!.id);
            setExperiments(data);
        } catch (err) {
            console.error("Failed to load experiments", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateDesign = async () => {
        if (!hypothesis) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/validation/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hypothesis, title })
            });
            const data = await res.json();
            if (data.design) setDesign(data.design);
        } catch (err) {
            console.error("AI Generation failed", err);
        } finally {
            setGenerating(false);
        }
    };

    const handleCreate = async () => {
        if (!title || !hypothesis || !design || !activeWorkspace || !user) return;
        setSubmitting(true);
        try {
            const newExp: Partial<Experiment> = {
                workspaceId: activeWorkspace.id,
                title,
                hypothesis,
                design,
                status: 'planned',
                metrics: [
                    { id: 'm1', name: 'Primary Conversion', description: 'Core conversion metric', type: 'quantitative', targetValue: 5 },
                    { id: 'm2', name: 'User Engagement', description: 'Time on page / Actions per session', type: 'quantitative', targetValue: 20 }
                ],
                metadata: {
                    authorId: user.uid,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };
            await createExperiment(newExp);
            setIsCreating(false);
            setTitle("");
            setHypothesis("");
            setDesign("");
            loadExperiments();
        } catch (err) {
            console.error("Failed to create experiment", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (exp: Experiment, newStatus: Experiment['status']) => {
        try {
            const updates: any = { status: newStatus };
            if (newStatus === 'in-progress' && !exp.metadata.startDate) {
                updates['metadata.startDate'] = new Date();
            }
            await updateExperiment(exp.id, updates);
            loadExperiments();
            if (selectedExp?.id === exp.id) setSelectedExp({ ...selectedExp, ...updates, status: newStatus });
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const handleAnalyze = async (exp: Experiment) => {
        try {
            await analyzeExperimentResults(exp.id, exp.metrics, user?.uid || 'anonymous');
            loadExperiments();
            // Refresh selected exp if open
            const updated = await getExperimentsByWorkspace(activeWorkspace!.id);
            const matching = updated.find(u => u.id === exp.id);
            if (matching) setSelectedExp(matching);
        } catch (err) {
            console.error("Analysis failed", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this experiment?")) return;
        try {
            await deleteExperiment(id);
            setExperiments(experiments.filter(e => e.id !== id));
            if (selectedExp?.id === id) setSelectedExp(null);
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!activeWorkspace) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <AlertTriangle className="w-12 h-12 text-zinc-400 mx-auto opacity-50" />
                    <h2 className="text-xl font-bold text-zinc-500">No Workspace Active</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto pb-20">
            {/* Header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 mb-4">
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Module 7: Validation Center</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3">Experiment Lab</h1>
                    <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                        Design, run, and analyze experiments to validate your product hypotheses with statistical rigor.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="shrink-0 flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm rounded-2xl shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" /> New Experiment
                </button>
            </header>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Experiment List */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest px-1">Active Experiments</h3>
                    {experiments.length === 0 ? (
                        <div className="p-8 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-white/5 text-center space-y-3">
                            <Beaker className="w-10 h-10 text-zinc-300 mx-auto opacity-50" />
                            <p className="text-sm font-bold text-zinc-400">No experiments yet</p>
                        </div>
                    ) : (
                        experiments.map(exp => (
                            <motion.button
                                key={exp.id}
                                layoutId={exp.id}
                                onClick={() => setSelectedExp(exp)}
                                className={`w-full text-left p-5 rounded-3xl border transition-all ${selectedExp?.id === exp.id
                                    ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20'
                                    : 'bg-white dark:bg-white/5 border-zinc-200/80 dark:border-white/10 hover:border-blue-500/40'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <StatusBadge status={exp.status} active={selectedExp?.id === exp.id} />
                                    <span className={`text-[10px] font-bold ${selectedExp?.id === exp.id ? 'text-blue-100' : 'text-zinc-400'}`}>
                                        {new Date(exp.metadata.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className={`font-bold text-sm mb-2 line-clamp-1 ${selectedExp?.id === exp.id ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                                    {exp.title}
                                </h4>
                                <p className={`text-[12px] line-clamp-2 leading-relaxed ${selectedExp?.id === exp.id ? 'text-blue-100/70' : 'text-zinc-500'}`}>
                                    {exp.hypothesis}
                                </p>
                            </motion.button>
                        ))
                    )}
                </div>

                {/* Detail Area */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {selectedExp ? (
                            <motion.div
                                key={selectedExp.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[32px] overflow-hidden shadow-sm"
                            >
                                {/* Detail Header */}
                                <div className="p-8 border-b border-zinc-100 dark:border-white/5">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                                <FlaskConical className="w-6 h-6 text-blue-500" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedExp.title}</h2>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <StatusBadge status={selectedExp.status} />
                                                    <span className="text-zinc-400 text-xs flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Created {new Date(selectedExp.metadata.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedExp.status === 'planned' && (
                                                <button onClick={() => handleStatusChange(selectedExp, 'in-progress')} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl active:scale-95 transition-all">
                                                    <PlayCircle className="w-4 h-4" /> Start Run
                                                </button>
                                            )}
                                            {selectedExp.status === 'in-progress' && (
                                                <>
                                                    <button onClick={() => handleStatusChange(selectedExp, 'paused')} className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 text-xs font-bold rounded-xl active:scale-95 transition-all border border-zinc-200 dark:border-white/10">
                                                        <PauseCircle className="w-4 h-4" /> Pause
                                                    </button>
                                                    <button onClick={() => handleAnalyze(selectedExp)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all">
                                                        <CheckCircle2 className="w-4 h-4" /> Final Analysis
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => handleDelete(selectedExp.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Hypothesis Box */}
                                    <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Brain className="w-4 h-4 text-blue-500" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Hypothesis</h4>
                                        </div>
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                            {selectedExp.hypothesis}
                                        </p>
                                    </div>
                                </div>

                                {/* Content Tabs (Result or Design) */}
                                <div className="p-8">
                                    {selectedExp.results ? (
                                        <div className="space-y-8">
                                            <div>
                                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                                    <BarChart2 className="w-4 h-4 text-blue-500" /> Statistical Results
                                                </h3>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {selectedExp.results.metrics.map(m => (
                                                        <div key={m.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5">
                                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{m.name}</p>
                                                            <div className="flex items-end gap-2">
                                                                <span className="text-2xl font-black text-zinc-900 dark:text-white">{m.value.toFixed(1)}%</span>
                                                                <span className="text-[10px] text-emerald-500 font-bold mb-1.5">Significant</span>
                                                            </div>
                                                            <div className="mt-3 h-1.5 w-full bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, m.value * 3)}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Verdict</h4>
                                                </div>
                                                <p className="text-[15px] font-bold text-zinc-900 dark:text-white leading-relaxed">
                                                    {selectedExp.results.conclusion}
                                                </p>
                                                <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-500/10 flex items-center gap-6">
                                                    <div>
                                                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase">P-Value</p>
                                                        <p className="text-sm font-black text-emerald-600">{(1 - selectedExp.results.statisticalSignificance).toFixed(4)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase">Confidence</p>
                                                        <p className="text-sm font-black text-emerald-600">{(selectedExp.results.statisticalSignificance * 100).toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4">
                                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                                    <ClipboardList className="w-4 h-4 text-zinc-400" /> Experiment Design
                                                </h3>
                                                <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-zinc-100 dark:border-white/5">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedExp.design}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                                    <ClipboardList className="w-4 h-4 text-blue-500" /> Experiment Design
                                                </h3>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded">Draft Mode</span>
                                            </div>
                                            <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/[0.02] p-8 rounded-[24px] border border-zinc-100 dark:border-white/5">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedExp.design}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-[60vh] rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-white/5 flex flex-col items-center justify-center text-center p-12">
                                <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center mb-6">
                                    <Beaker className="w-8 h-8 text-zinc-300" />
                                </div>
                                <h2 className="text-xl font-bold text-zinc-400 mb-2">Select an experiment</h2>
                                <p className="text-sm text-zinc-500 max-w-xs">
                                    Choose an experiment from the left to view its design, status, or analysis results.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreating(false)}
                            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-[#0A0A0A] rounded-[32px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <Beaker className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Design Experiment</h2>
                                </div>
                                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-all">
                                    <ArrowRight className="w-5 h-5 rotate-45" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Experiment Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g., Onboarding Flow Redesign A/B"
                                        className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Hypothesis</label>
                                        <button
                                            onClick={handleGenerateDesign}
                                            disabled={generating || !hypothesis}
                                            className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 disabled:opacity-30 flex items-center gap-1"
                                        >
                                            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            AI Suggest Design
                                        </button>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={hypothesis}
                                        onChange={e => setHypothesis(e.target.value)}
                                        placeholder="Describe what you think will happen and why..."
                                        className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Design Specification</label>
                                    <textarea
                                        rows={6}
                                        value={design}
                                        onChange={e => setDesign(e.target.value)}
                                        placeholder="Detailed experiment design (audience, variant, setup)..."
                                        className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-zinc-50 dark:bg-white/[0.02] border-t border-zinc-100 dark:border-white/5 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="px-6 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={submitting || !title || !hypothesis || !design}
                                    className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin text-center" /> : "Save Experiment"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatusBadge({ status, active = false }: { status: Experiment['status'], active?: boolean }) {
    const config = {
        planned: { icon: Clock, label: 'Planned', color: active ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400' },
        'in-progress': { icon: PlayCircle, label: 'Running', color: active ? 'bg-blue-100 text-blue-900' : 'bg-blue-500/10 text-blue-500' },
        completed: { icon: CheckCircle2, label: 'Complete', color: active ? 'bg-emerald-100 text-emerald-900' : 'bg-emerald-500/10 text-emerald-500' },
        paused: { icon: PauseCircle, label: 'Paused', color: active ? 'bg-orange-100 text-orange-900' : 'bg-orange-500/10 text-orange-500' },
    };

    const s = config[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${s.color}`}>
            <s.icon className="w-2.5 h-2.5" />
            {s.label}
        </span>
    );
}

