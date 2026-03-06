"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    Cpu, Code, Terminal, Server, CheckCircle2,
    Plus, Loader2, Sparkles, ChevronRight,
    FileText, Zap, AlertCircle, Layers,
    Box, GitBranch, ShieldCheck, Activity
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Feature {
    id: string;
    title: string;
    description: string;
    userStories?: string[];
}

interface Test {
    id: string;
    name: string;
    description: string;
    type: 'unit' | 'integration' | 'e2e';
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

interface TechnicalSpec {
    id: string;
    featureId: string;
    title: string;
    technicalRequirements: string[];
    architecture: string;
    dependencies: string[];
    effortEstimate: string;
    implementationPlan: string;
    tests: Test[];
    metadata: {
        status: 'draft' | 'review' | 'approved' | 'implemented';
        updatedAt: string;
    };
}

export default function EngineeringCollaborationPage() {
    const { activeWorkspace } = useWorkspace();
    const { user } = useAuth();

    const [features, setFeatures] = useState<Feature[]>([]);
    const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
    const [specs, setSpecs] = useState<TechnicalSpec[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (activeWorkspace) {
            loadFeatures();
            loadSpecs();
        }
    }, [activeWorkspace]);

    const loadFeatures = async () => {
        try {
            const res = await fetch(`/api/localdb?collection=features&workspaceId=${activeWorkspace?.id}`);
            const data = await res.json();
            setFeatures(data || []);
        } catch (err) {
            console.error("Failed to load features", err);
        }
    };

    const loadSpecs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/localdb?collection=technical_specs&workspaceId=${activeWorkspace?.id}`);
            const data = await res.json();
            setSpecs(data || []);
        } catch (err) {
            console.error("Failed to load specs", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSpec = async () => {
        if (!selectedFeature || generating) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/engineering/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    featureTitle: selectedFeature.title,
                    featureDescription: selectedFeature.description,
                    userStories: selectedFeature.userStories || []
                })
            });
            const data = await res.json();
            if (data.success) {
                const newSpec = {
                    ...data.spec,
                    featureId: selectedFeature.id,
                    workspaceId: activeWorkspace?.id,
                    metadata: {
                        authorId: user?.uid,
                        status: 'draft',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                };

                await fetch('/api/localdb', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        collection: 'technical_specs',
                        action: 'add',
                        data: newSpec
                    })
                });

                loadSpecs();
            }
        } catch (err) {
            console.error("Failed to generate spec", err);
        } finally {
            setGenerating(false);
        }
    };

    if (!activeWorkspace) {
        return (
            <div className="h-[80vh] flex items-center justify-center text-zinc-500 font-bold">
                Select a workspace to enter Engineering Collaboration.
            </div>
        );
    }

    const currentSpec = specs.find(s => s.featureId === selectedFeature?.id);

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                        <Terminal className="w-3 h-3" /> Technical Engine
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Engineering Hub</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                        Bridge the gap between product requirements and technical implementation with AI-generated system architectures.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Feature Selection Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 shadow-sm">
                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Feature Backlog ({features.length})
                        </h3>
                        <div className="space-y-2">
                            {features.length === 0 ? (
                                <p className="text-[12px] text-zinc-400 italic py-4">No features synced from Strategy yet.</p>
                            ) : (
                                features.map(feature => (
                                    <button
                                        key={feature.id}
                                        onClick={() => setSelectedFeature(feature)}
                                        className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between group ${selectedFeature?.id === feature.id
                                            ? 'bg-blue-500/5 border-blue-500/30 text-blue-600'
                                            : 'bg-transparent border-zinc-100 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:border-zinc-200 dark:hover:border-white/10'
                                            }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[13px] font-bold truncate">{feature.title}</div>
                                            <div className="text-[10px] font-bold opacity-60 uppercase">{specs.some(s => s.featureId === feature.id) ? 'Spec Ready' : 'Pending Tech Spec'}</div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedFeature?.id === feature.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="p-8 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Cpu className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-2">Technical AI</h3>
                            <p className="text-blue-100 text-[12px] leading-relaxed mb-6 font-medium">
                                Select a feature from your strategy to generate architecture, technical requirements, and test plans instantly.
                            </p>
                            <Activity className="w-8 h-8 opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {!selectedFeature ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-white/10 text-center space-y-4">
                            <Box className="w-12 h-12 text-zinc-300" />
                            <h3 className="text-lg font-bold text-zinc-400">Select a feature to begin technical drafting</h3>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedFeature.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Active Feature Header */}
                                <div className="p-8 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 px-8 py-10 opacity-[0.02]">
                                        <Zap className="w-40 h-40" />
                                    </div>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                    <Box className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedFeature.title}</h2>
                                            </div>
                                            <p className="text-zinc-500 text-sm max-w-2xl">{selectedFeature.description}</p>
                                        </div>
                                        {!currentSpec && (
                                            <button
                                                onClick={handleGenerateSpec}
                                                disabled={generating}
                                                className="shrink-0 h-14 px-8 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                                            >
                                                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                                {generating ? 'Drafting Technical Spec...' : 'Generate Tech Spec'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {currentSpec ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Core Technical Data */}
                                        <div className="p-8 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 space-y-8">
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                                                    <Server className="w-4 h-4" /> System Architecture
                                                </h3>
                                                <div className="text-[14px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                                                    {currentSpec.architecture}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                                    <Code className="w-4 h-4" /> Technical Requirements
                                                </h3>
                                                <div className="space-y-2">
                                                    {currentSpec.technicalRequirements.map((req, i) => (
                                                        <div key={i} className="flex items-start gap-2 text-[13px] text-zinc-700 dark:text-zinc-300">
                                                            <div className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                                                            {req}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                                                <div className="flex items-center justify-between text-[12px] font-bold">
                                                    <span className="text-zinc-400">IMPLEMENTATION PLAN</span>
                                                    <span className="text-blue-500">{currentSpec.effortEstimate}</span>
                                                </div>
                                                <div className="text-[13px] text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed italic">
                                                    {currentSpec.implementationPlan}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tests & Dependencies */}
                                        <div className="space-y-6">
                                            <div className="p-8 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-6 flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4" /> Quality Assurance & Tests
                                                </h3>
                                                <div className="space-y-4">
                                                    {currentSpec.tests.map((test, i) => (
                                                        <div key={i} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[13px] font-bold text-zinc-900 dark:text-white">{test.name}</span>
                                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-500 uppercase">{test.type}</span>
                                                            </div>
                                                            <p className="text-[11px] text-zinc-500">{test.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-8 rounded-[40px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                                                    <GitBranch className="w-4 h-4" /> Technical Dependencies
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {currentSpec.dependencies.map((dep, i) => (
                                                        <span key={i} className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                                                            {dep}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    generating ? (
                                        <div className="p-12 text-center space-y-6 animate-pulse">
                                            <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
                                            <div className="space-y-2">
                                                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-48 mx-auto" />
                                                <div className="h-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-full w-64 mx-auto" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center rounded-[40px] border-2 border-dashed border-zinc-100 dark:border-white/10 space-y-4">
                                            <AlertCircle className="w-12 h-12 text-zinc-200 mx-auto" />
                                            <div className="space-y-1">
                                                <p className="text-lg font-bold text-zinc-400">No Technical Draft Found</p>
                                                <p className="text-sm text-zinc-400">Generate a spec for this feature to bridge the gap with engineering.</p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}
