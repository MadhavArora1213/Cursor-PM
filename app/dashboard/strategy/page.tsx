"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
    Lightbulb, Target, ChevronDown, Plus, Trash2, Loader2,
    ShieldAlert, Sparkles, CheckCircle2, FileText, ArrowRight, BarChart2, Cpu
} from "lucide-react";
import { getResearchByWorkspace } from "@/lib/firebase/researchService";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ResearchItem } from "@/types/research";

// =====================================================================
// MODULE 6: STRATEGY PLANNER
// Converts analyzed research into Hypotheses → User Stories → OKRs
// =====================================================================

interface Hypothesis {
    id: string;
    workspaceId: string;
    title: string;
    solution: string;
    benefit: string;
    need: string;
    confidence: 'low' | 'medium' | 'high';
    sourceResearchIds: string[];
    status: 'draft' | 'validated' | 'rejected';
    createdAt: Date;
}

interface Strategy {
    hypothesis: Hypothesis;
    userStories: string[];
    okrs: { objective: string; keyResults: string[] }[];
}

// =====================================================================
// LOCAL STRATEGY GENERATOR (Module 6 Core Logic)
// In production: send to Ollama/Llama3 via /api/generate
// =====================================================================
function generateStrategyFromResearch(items: ResearchItem[]): Strategy | null {
    const analyzedItems = items.filter(i => i.status === 'analyzed' && i.themes);
    if (analyzedItems.length === 0) return null;

    // Count theme frequency across all analyzed items
    const themeCount: Record<string, number> = {};
    for (const item of analyzedItems) {
        for (const theme of (item.themes || [])) {
            themeCount[theme] = (themeCount[theme] || 0) + 1;
        }
    }

    // Pick the most common theme
    const topTheme = Object.entries(themeCount).sort((a, b) => b[1] - a[1])[0];
    if (!topTheme) return null;

    const topThemeName = topTheme[0];
    const positiveItems = analyzedItems.filter(i => i.sentiment === 'positive').length;
    const confidenceLevel: 'low' | 'medium' | 'high' =
        analyzedItems.length >= 5 ? 'high' :
            analyzedItems.length >= 2 ? 'medium' : 'low';

    const hypothesis: Hypothesis = {
        id: `hyp_${Date.now()}`,
        workspaceId: '',
        title: `Improve ${topThemeName}`,
        solution: `redesign and simplify the ${topThemeName.toLowerCase()} experience`,
        benefit: `user satisfaction and task completion rate will increase by 30%`,
        need: `${topThemeName} appeared in ${topTheme[1]}/${analyzedItems.length} research items as a top concern`,
        confidence: confidenceLevel,
        sourceResearchIds: analyzedItems.map(i => i.id),
        status: 'draft',
        createdAt: new Date(),
    };

    const userStories = [
        `As a new user, I want a clear ${topThemeName.toLowerCase()} walkthrough so I can complete my first task without confusion.`,
        `As a product manager, I want to see real-time metrics on ${topThemeName.toLowerCase()} so I can identify and resolve bottlenecks.`,
        `As a team member, I want streamlined ${topThemeName.toLowerCase()} workflows so I can collaborate efficiently without friction.`,
    ];

    const okrs = [
        {
            objective: `Resolve the top user pain point: ${topThemeName}`,
            keyResults: [
                `Reduce user-reported issues related to ${topThemeName.toLowerCase()} by 50% by Q2`,
                `Increase NPS score from baseline by +15 points within 60 days of launch`,
                `Achieve 80% task completion rate on redesigned flow (measured in user testing)`,
            ]
        }
    ];

    return { hypothesis, userStories, okrs };
}

export default function StrategyPlannerPage() {
    const { activeWorkspace } = useWorkspace();
    const { user } = useAuth();

    const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
    const [strategy, setStrategy] = useState<Strategy | null>(null);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [expandedSection, setExpandedSection] = useState<string | null>('hypothesis');

    useEffect(() => {
        if (!activeWorkspace) { setLoading(false); return; }
        getResearchByWorkspace(activeWorkspace.id)
            .then(items => {
                setResearchItems(items);
                // If there's analyzed research, auto-generate a preview strategy
                const analyzed = items.filter(i => i.status === 'analyzed');
                if (analyzed.length > 0) {
                    const gen = generateStrategyFromResearch(items);
                    if (gen) setStrategy(gen);
                }
            })
            .finally(() => setLoading(false));
    }, [activeWorkspace]);

    const handleGenerateStrategy = () => {
        setGenerating(true);
        setTimeout(() => {
            const gen = generateStrategyFromResearch(researchItems);
            setStrategy(gen);
            setGenerating(false);
        }, 1500);
    };

    const analyzedCount = researchItems.filter(i => i.status === 'analyzed').length;
    const totalCount = researchItems.length;

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    if (!activeWorkspace) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <ShieldAlert className="w-12 h-12 text-zinc-400 mx-auto opacity-50" />
                    <h2 className="text-xl font-bold text-zinc-500">No Environment Active</h2>
                    <p className="text-sm text-zinc-400">Deploy or select a workspace to access the Strategy Planner.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1100px] mx-auto pb-20">
            {/* Header */}
            <header className="mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 mb-4">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Module 6: Strategy Planner</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
                    Strategy Planner
                </h1>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                    The AI reads all your analyzed research and generates product hypotheses, OKRs, and actionable user stories automatically.
                </p>
            </header>

            {/* Research Context Banner */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[24px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white">Context Intel Status</h3>
                        <p className="text-[13px] text-zinc-500">
                            {analyzedCount > 0
                                ? `${analyzedCount} of ${totalCount} research items analyzed and ready for strategy generation.`
                                : 'No analyzed research yet. Upload and process files in Research Hub first.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleGenerateStrategy}
                    disabled={generating || analyzedCount === 0}
                    className="shrink-0 flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-[14px] rounded-2xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {generating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Strategy</>
                    )}
                </button>
            </motion.div>

            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-zinc-400 animate-spin" /></div>
            ) : !strategy ? (
                <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-3xl space-y-4">
                    <Lightbulb className="w-10 h-10 text-zinc-300 mx-auto" />
                    <p className="text-lg font-bold text-zinc-400">No strategy generated yet</p>
                    <p className="text-[14px] text-zinc-400 max-w-md mx-auto">Upload and process at least one document in the Research Hub, then click "Generate Strategy" above.</p>
                </div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

                    {/* === HYPOTHESIS CARD === */}
                    <motion.div variants={itemVariants} className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[28px] overflow-hidden shadow-sm">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'hypothesis' ? null : 'hypothesis')}
                            className="w-full flex items-center justify-between p-6 sm:p-8 text-left hover:bg-zinc-50 dark:hover:bg-white/2 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-500/20">
                                    <Lightbulb className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">AI-Generated Hypothesis</h2>
                                    <p className="text-[13px] text-zinc-500">Based on {strategy.hypothesis.sourceResearchIds.length} analyzed research items</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${expandedSection === 'hypothesis' ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'hypothesis' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 sm:px-8 pb-8 space-y-5 border-t border-zinc-200/50 dark:border-white/10 pt-6">
                                        {/* Hypothesis Sentence */}
                                        <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                                            <span className="font-bold text-purple-600 dark:text-purple-400">If we </span>
                                            {strategy.hypothesis.solution},
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400"> then </span>
                                            {strategy.hypothesis.benefit}
                                            <span className="font-bold text-blue-600 dark:text-blue-400"> because </span>
                                            {strategy.hypothesis.need}.
                                        </div>
                                        {/* Confidence */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">Confidence Level:</span>
                                            <span className={`px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider border ${strategy.hypothesis.confidence === 'high' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20' :
                                                    strategy.hypothesis.confidence === 'medium' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-500/20' :
                                                        'bg-zinc-100 dark:bg-white/5 text-zinc-500 border-zinc-200 dark:border-white/10'
                                                }`}>
                                                {strategy.hypothesis.confidence}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* === USER STORIES CARD === */}
                    <motion.div variants={itemVariants} className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[28px] overflow-hidden shadow-sm">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'stories' ? null : 'stories')}
                            className="w-full flex items-center justify-between p-6 sm:p-8 text-left hover:bg-zinc-50 dark:hover:bg-white/2 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center border border-blue-200 dark:border-blue-500/20">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">User Stories</h2>
                                    <p className="text-[13px] text-zinc-500">{strategy.userStories.length} stories generated from top theme</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${expandedSection === 'stories' ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'stories' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 sm:px-8 pb-8 space-y-3 border-t border-zinc-200/50 dark:border-white/10 pt-6">
                                        {strategy.userStories.map((story, i) => (
                                            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-white/2 hover:border-blue-400/50 transition-colors">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                                                    {i + 1}
                                                </div>
                                                <p className="text-[14px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{story}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* === OKRs CARD === */}
                    <motion.div variants={itemVariants} className="bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[28px] overflow-hidden shadow-sm">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'okrs' ? null : 'okrs')}
                            className="w-full flex items-center justify-between p-6 sm:p-8 text-left hover:bg-zinc-50 dark:hover:bg-white/2 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20">
                                    <Target className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">OKRs</h2>
                                    <p className="text-[13px] text-zinc-500">Objectives &amp; Key Results mapped to your hypothesis</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${expandedSection === 'okrs' ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'okrs' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 sm:px-8 pb-8 space-y-6 border-t border-zinc-200/50 dark:border-white/10 pt-6">
                                        {strategy.okrs.map((okr, i) => (
                                            <div key={i} className="space-y-4">
                                                {/* Objective */}
                                                <div className="flex items-start gap-3">
                                                    <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                        <Target className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Objective</p>
                                                        <p className="font-bold text-zinc-900 dark:text-white">{okr.objective}</p>
                                                    </div>
                                                </div>
                                                {/* Key Results */}
                                                <div className="ml-10 space-y-3">
                                                    {okr.keyResults.map((kr, j) => (
                                                        <div key={j} className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-white/2 border border-zinc-200/50 dark:border-white/5">
                                                            <BarChart2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                                                            <p className="text-[14px] text-zinc-700 dark:text-zinc-300">{kr}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Footer Action */}
                    <motion.div variants={itemVariants} className="flex justify-end pt-4">
                        <button className="flex items-center gap-2 px-8 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity">
                            Export as PRD <ArrowRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}
