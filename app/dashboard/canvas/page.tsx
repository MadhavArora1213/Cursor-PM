"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    Layout, FileText, Lightbulb, Target, Map, MessageSquare,
    Plus, X, GripVertical, Trash2, Loader2, ShieldAlert, Sparkles,
    Bot, Send, User, ChevronRight, Maximize2, Minimize2,
    Cpu, TrendingUp, AlertTriangle, Rocket, Brain, Search, Tag, Check, Cloud
} from "lucide-react";
import { getResearchByWorkspace } from "@/lib/firebase/researchService";
import { getCanvasBoard, saveCanvasBoard, CanvasCard } from "@/lib/firebase/canvasService";
import { ResearchItem } from "@/types/research";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ═══════════════════════════════════════════════════════
// CANVAS WORKSPACE — AI-Powered Interactive Board
// ─────────────────────────────────────────────────────
// Three-panel layout: Sidebar · Canvas · AI Chat
// Drag cards, view documents, interact with AI
// ═══════════════════════════════════════════════════════

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

export default function CanvasWorkspacePage() {
    const { activeWorkspace } = useWorkspace();
    const { user } = useAuth();

    // Data
    const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

    // Canvas
    const [cards, setCards] = useState<CanvasCard[]>([]);
    const [selectedCard, setSelectedCard] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [draggingCard, setDraggingCard] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // AI Chat
    const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Sidebar
    const [sidebarSection, setSidebarSection] = useState<'research' | 'strategy'>('research');

    // 1. Initial Load (Board + Research)
    useEffect(() => {
        if (!activeWorkspace) { setLoading(false); return; }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Try loading saved board first
                const savedCards = await getCanvasBoard(activeWorkspace.id);
                if (savedCards && savedCards.length > 0) {
                    setCards(savedCards);
                } else {
                    // Fallback: Auto-populate from research if new
                    const items = await getResearchByWorkspace(activeWorkspace.id);
                    const initialCards: CanvasCard[] = items
                        .filter(i => i.status === 'analyzed')
                        .slice(0, 6)
                        .map((item, i) => ({
                            id: `card-${item.id}`,
                            type: 'research' as const,
                            title: item.title,
                            content: item.summary?.substring(0, 200) || 'No summary available',
                            color: item.sentiment === 'positive' ? 'emerald' : item.sentiment === 'negative' ? 'red' : 'blue',
                            x: 40 + (i % 3) * 320,
                            y: 40 + Math.floor(i / 3) * 240,
                            width: 300,
                            meta: { sentiment: item.sentiment || 'unknown', type: item.type },
                        }));
                    setCards(initialCards);
                }
                const res = await getResearchByWorkspace(activeWorkspace.id);
                setResearchItems(res);
            } catch (err) {
                console.error('Canvas load error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeWorkspace]);

    // 2. Auto-save Effect
    useEffect(() => {
        if (!activeWorkspace || cards.length === 0 || loading) return;

        setSaveStatus('saving');
        const timer = setTimeout(async () => {
            try {
                await saveCanvasBoard(activeWorkspace.id, cards);
                setSaveStatus('saved');
            } catch (err) {
                console.error('Save failed:', err);
                setSaveStatus('error');
            }
        }, 2000); // 2 second debounce

        return () => clearTimeout(timer);
    }, [cards, activeWorkspace, loading]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

    // Canvas drag handlers
    const handleMouseDown = (cardId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const card = cards.find(c => c.id === cardId);
        if (!card) return;
        setDraggingCard(cardId);
        setDragOffset({ x: e.clientX - card.x, y: e.clientY - card.y });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingCard) return;
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        setCards(prev => prev.map(c =>
            c.id === draggingCard
                ? { ...c, x: Math.max(0, e.clientX - dragOffset.x - canvasRect.left), y: Math.max(0, e.clientY - dragOffset.y - canvasRect.top) }
                : c
        ));
    }, [draggingCard, dragOffset]);

    const handleMouseUp = useCallback(() => { setDraggingCard(null); }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Add card to canvas
    const addCardToCanvas = (type: CanvasCard['type'], title: string, content: string, color: string = 'blue') => {
        const newCard: CanvasCard = {
            id: `card-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type, title, content, color,
            x: 40 + Math.random() * 200,
            y: 40 + Math.random() * 200,
            width: 300,
        };
        setCards(prev => [...prev, newCard]);
    };

    const removeCard = (cardId: string) => {
        setCards(prev => prev.filter(c => c.id !== cardId));
        if (selectedCard === cardId) setSelectedCard(null);
    };

    // AI Chat
    const handleChatSend = async () => {
        if (!chatInput.trim() || chatLoading) return;
        const msg: ChatMsg = { role: 'user', content: chatInput.trim() };
        setChatMsgs(prev => [...prev, msg]);
        setChatInput('');
        setChatLoading(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: msg.content,
                    workspaceId: activeWorkspace?.id,
                    chatHistory: chatMsgs.slice(-4),
                }),
            });
            const data = await res.json();
            const answer = data.answer || 'Sorry, could not process your question.';
            setChatMsgs(prev => [...prev, { role: 'assistant', content: answer }]);
        } catch {
            setChatMsgs(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
        } finally { setChatLoading(false); }
    };

    // Save AI output to canvas
    const saveAIToCanvas = (content: string) => {
        addCardToCanvas('ai-output', 'AI Insight', content.substring(0, 300), 'purple');
    };

    if (!activeWorkspace) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <ShieldAlert className="w-12 h-12 text-zinc-400 mx-auto opacity-50" />
                    <h2 className="text-xl font-bold text-zinc-500">No Environment Active</h2>
                </div>
            </div>
        );
    }

    const cardColorMap: Record<string, { bg: string; border: string; icon: string }> = {
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/5', border: 'border-emerald-200 dark:border-emerald-500/20', icon: 'text-emerald-500' },
        red: { bg: 'bg-red-50 dark:bg-red-500/5', border: 'border-red-200 dark:border-red-500/20', icon: 'text-red-500' },
        blue: { bg: 'bg-blue-50 dark:bg-blue-500/5', border: 'border-blue-200 dark:border-blue-500/20', icon: 'text-blue-500' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-500/5', border: 'border-purple-200 dark:border-purple-500/20', icon: 'text-purple-500' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-500/5', border: 'border-amber-200 dark:border-amber-500/20', icon: 'text-amber-500' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-500/5', border: 'border-orange-200 dark:border-orange-500/20', icon: 'text-orange-500' },
    };

    const typeIconMap: Record<string, typeof FileText> = {
        research: FileText,
        insight: TrendingUp,
        feature: Lightbulb,
        roadmap: Map,
        note: Tag,
        'ai-output': Brain,
    };

    return (
        <div className="flex flex-col h-[calc(100vh-96px)] -mx-4 sm:-mx-6 md:-mx-12 -mt-4 sm:-mt-6 md:-mt-12">
            {/* Top Bar */}
            <div className="shrink-0 px-6 py-3 bg-white/50 dark:bg-[#0A0A0A]/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20">
                        <Layout className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="font-bold text-zinc-900 dark:text-white text-sm">Canvas Workspace</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-zinc-500">{cards.length} cards on board</p>
                            <span className={`text-[9px] flex items-center gap-1 font-bold ${saveStatus === 'saved' ? 'text-emerald-500' : saveStatus === 'saving' ? 'text-blue-500' : 'text-red-500'}`}>
                                {saveStatus === 'saved' ? <><Check className="w-2.5 h-2.5" /> Saved</> : saveStatus === 'saving' ? <><Cloud className="w-2.5 h-2.5 animate-pulse" /> Saving...</> : <><AlertTriangle className="w-2.5 h-2.5" /> Error</>}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => addCardToCanvas('note', 'New Note', 'Click to edit...', 'amber')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 rounded-lg text-[11px] font-bold border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all">
                        <Plus className="w-3 h-3" /> Add Note
                    </button>
                    <button onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all ${showChat
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10'}`}>
                        <MessageSquare className="w-3 h-3" /> {showChat ? 'Hide Chat' : 'Show Chat'}
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-[220px] shrink-0 bg-white/30 dark:bg-[#0A0A0A]/30 backdrop-blur-xl border-r border-zinc-200/50 dark:border-white/10 flex flex-col overflow-hidden">
                    {/* Section Tabs */}
                    <div className="flex border-b border-zinc-200/50 dark:border-white/10">
                        {[
                            { id: 'research' as const, label: 'Research', icon: Search },
                            { id: 'strategy' as const, label: 'Strategy', icon: Target },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setSidebarSection(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold transition-all ${sidebarSection === tab.id
                                    ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                                    : 'text-zinc-400'
                                    }`}>
                                <tab.icon className="w-3 h-3" /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
                        ) : sidebarSection === 'research' ? (
                            researchItems.length === 0 ? (
                                <p className="text-[11px] text-zinc-400 text-center py-4">No research uploaded</p>
                            ) : (
                                researchItems.map(item => (
                                    <button key={item.id}
                                        onClick={() => addCardToCanvas('research', item.title, item.summary?.substring(0, 200) || 'No summary', item.sentiment === 'positive' ? 'emerald' : item.sentiment === 'negative' ? 'red' : 'blue')}
                                        className="w-full text-left p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5 hover:border-blue-400/50 dark:hover:border-blue-500/30 transition-all group">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-3 h-3 text-blue-500" />
                                            <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">{item.title}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 line-clamp-2">{item.summary?.replace(/[#*`_~>-]/g, '').substring(0, 80) || 'Pending...'}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {item.sentiment && <span className={`text-[9px] font-bold capitalize ${item.sentiment === 'positive' ? 'text-emerald-500' : item.sentiment === 'negative' ? 'text-red-500' : 'text-zinc-400'}`}>{item.sentiment}</span>}
                                            <span className="text-[9px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">+ Add to Canvas</span>
                                        </div>
                                    </button>
                                ))
                            )
                        ) : (
                            <div className="space-y-2">
                                {[
                                    { title: 'Add Feature Idea', type: 'feature' as const, color: 'amber' },
                                    { title: 'Add Roadmap Item', type: 'roadmap' as const, color: 'purple' },
                                    { title: 'Add Risk Note', type: 'note' as const, color: 'red' },
                                ].map(item => (
                                    <button key={item.title}
                                        onClick={() => addCardToCanvas(item.type, item.title.replace('Add ', ''), 'Click to edit content...', item.color)}
                                        className="w-full text-left p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5 hover:border-blue-400/50 transition-all text-[11px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                        <Plus className="w-3 h-3" /> {item.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Canvas Area */}
                <div ref={canvasRef} className="flex-1 relative overflow-auto bg-[#FAFAFA] dark:bg-[#050505]"
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                    onClick={() => setSelectedCard(null)}>
                    {cards.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-3">
                                <Layout className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mx-auto" />
                                <p className="text-sm font-bold text-zinc-300 dark:text-zinc-700">Your canvas is empty</p>
                                <p className="text-[12px] text-zinc-400">Click items from the sidebar to add cards</p>
                            </div>
                        </div>
                    )}

                    {cards.map(card => {
                        const colors = cardColorMap[card.color] || cardColorMap.blue;
                        const IconComponent = typeIconMap[card.type] || FileText;
                        const isSelected = selectedCard === card.id;
                        return (
                            <div key={card.id}
                                className={`absolute group ${draggingCard === card.id ? 'z-50 cursor-grabbing' : 'cursor-grab z-10'}`}
                                style={{ left: card.x, top: card.y, width: card.width }}
                                onClick={(e) => { e.stopPropagation(); setSelectedCard(card.id); }}>
                                <div
                                    className={`rounded-xl border shadow-sm hover:shadow-md transition-all ${colors.bg} ${colors.border} ${isSelected ? 'ring-2 ring-blue-500/50 shadow-lg' : ''}`}>
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200/30 dark:border-white/5"
                                        onMouseDown={(e) => handleMouseDown(card.id, e)}>
                                        <div className="flex items-center gap-1.5">
                                            <GripVertical className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                                            <IconComponent className={`w-3 h-3 ${colors.icon}`} />
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{card.type}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); removeCard(card.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-all">
                                            <X className="w-3 h-3 text-zinc-400 hover:text-red-500" />
                                        </button>
                                    </div>
                                    {/* Card Body */}
                                    <div className="p-3">
                                        <h4 className="font-bold text-zinc-900 dark:text-white text-[12px] mb-1 line-clamp-2">{card.title}</h4>
                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-4 leading-relaxed">{card.content}</p>
                                        {card.meta && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {card.meta.sentiment && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${card.meta.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-600' : card.meta.sentiment === 'negative' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
                                                        {card.meta.sentiment}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* AI Chat Panel */}
                <AnimatePresence>
                    {showChat && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="shrink-0 bg-white/50 dark:bg-[#0A0A0A]/50 backdrop-blur-xl border-l border-zinc-200/50 dark:border-white/10 flex flex-col overflow-hidden">
                            {/* Chat Header */}
                            <div className="shrink-0 px-4 py-3 border-b border-zinc-200/50 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                                        <Bot className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white text-[12px]">AI Assistant</h3>
                                        <p className="text-[9px] text-zinc-500">RAG-powered research chat</p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {chatMsgs.length === 0 && (
                                    <div className="text-center py-6 space-y-2">
                                        <Brain className="w-8 h-8 text-zinc-200 dark:text-zinc-700 mx-auto" />
                                        <p className="text-[11px] text-zinc-400">Ask about your research</p>
                                        <div className="space-y-1">
                                            {['Top user complaints?', 'Feature requests?', 'Onboarding issues?'].map(q => (
                                                <button key={q} onClick={() => setChatInput(q)}
                                                    className="w-full text-left px-2.5 py-1.5 text-[10px] text-zinc-500 bg-zinc-50 dark:bg-white/[0.02] rounded-lg border border-zinc-200/50 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all">
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {chatMsgs.map((msg, i) => (
                                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0 mt-1">
                                                <Bot className="w-2.5 h-2.5 text-blue-500" />
                                            </div>
                                        )}
                                        <div className={`max-w-[85%] rounded-xl px-3 py-2 ${msg.role === 'user'
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-white/5'
                                            }`}>
                                            {msg.role === 'assistant' ? (
                                                <div className="text-[11px] leading-relaxed prose prose-xs dark:prose-invert max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                    <button onClick={() => saveAIToCanvas(msg.content)}
                                                        className="mt-1.5 flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded text-[9px] font-bold border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                                                        <Plus className="w-2.5 h-2.5" /> Add to Canvas
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-[11px]">{msg.content}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {chatLoading && (
                                    <div className="flex gap-2">
                                        <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                                            <Bot className="w-2.5 h-2.5 text-blue-500" />
                                        </div>
                                        <div className="bg-zinc-100 dark:bg-white/5 rounded-xl px-3 py-2 border border-zinc-200/50 dark:border-white/5">
                                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <div className="shrink-0 px-3 py-3 border-t border-zinc-200/50 dark:border-white/10">
                                <div className="flex gap-2">
                                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                                        placeholder="Ask about your research..."
                                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-[11px] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all" />
                                    <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()}
                                        className="px-3 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40">
                                        <Send className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
