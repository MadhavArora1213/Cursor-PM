"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    Building2, Plus, Users, ShieldAlert, Settings,
    Trash2, Mail, CheckCircle2, ChevronDown, UserPlus, HardDrive, Inbox, ShieldCheck
} from "lucide-react";
import {
    updateWorkspace, addWorkspaceMember, removeWorkspaceMember, getUserByEmail, updateWorkspaceMemberRole
} from "@/lib/firebase/workspaceService";
import { motion, AnimatePresence, Variants } from "framer-motion";

export default function WorkspacePage() {
    const { user } = useAuth();
    const {
        activeWorkspace, workspaces, loadingWorkspaces,
        setActiveWorkspaceId, refreshWorkspaces, createInitialWorkspace, deleteCurrentWorkspace
    } = useWorkspace();

    // Create Workspace State
    const [isCreating, setIsCreating] = useState(false);
    const [newWsName, setNewWsName] = useState("");
    const [newWsDesc, setNewWsDesc] = useState("");
    const [creatingLoading, setCreatingLoading] = useState(false);

    // Invite Member State
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
    const [invitingLoading, setInvitingLoading] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [inviteSuccess, setInviteSuccess] = useState("");

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWsName.trim()) return;

        setCreatingLoading(true);
        try {
            await createInitialWorkspace(newWsName, newWsDesc);
            setIsCreating(false);
            setNewWsName("");
            setNewWsDesc("");
        } catch (err) {
            console.error(err);
        } finally {
            setCreatingLoading(false);
        }
    };

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeWorkspace || !inviteEmail.trim()) return;

        setInvitingLoading(true);
        setInviteError("");
        setInviteSuccess("");

        try {
            const foundUser = await getUserByEmail(inviteEmail);
            if (!foundUser) {
                setInviteError("User not found. They must sign up first.");
                setInvitingLoading(false);
                return;
            }

            await addWorkspaceMember(activeWorkspace.id, {
                userId: foundUser.id,
                email: foundUser.email,
                name: foundUser.name || 'Anonymous User',
                avatar: foundUser.avatar || '',
                role: inviteRole
            });

            setInviteSuccess(`${foundUser.email} invited successfully!`);
            setInviteEmail("");
            await refreshWorkspaces();
        } catch (err: any) {
            setInviteError(err.message || "Failed to invite member.");
        } finally {
            setInvitingLoading(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!activeWorkspace) return;
        if (confirm("Are you sure you want to remove this member?")) {
            try {
                await removeWorkspaceMember(activeWorkspace.id, userId);
                await refreshWorkspaces();
            } catch (err: any) {
                alert(err.message);
            }
        }
    };

    const handleRoleChange = async (userId: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') => {
        if (!activeWorkspace) return;
        try {
            await updateWorkspaceMemberRole(activeWorkspace.id, userId, newRole);
            await refreshWorkspaces();
        } catch (err: any) {
            alert(err.message || "Failed to update member role");
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!activeWorkspace) return;
        if (confirm("CRITICAL WARNING: Are you sure you want to permanently delete this entire workspace and all its data? This action cannot be undone.")) {
            try {
                await deleteCurrentWorkspace(activeWorkspace.id);
            } catch (err: any) {
                alert(err.message || "Failed to delete workspace.");
            }
        }
    };

    if (loadingWorkspaces) {
        return (
            <div className="flex h-[60vh]items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-white" />
            </div>
        );
    }

    const currentUserRole = activeWorkspace?.members.find(m => m.userId === user?.uid)?.role;
    const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

    const pageVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, scale: 0.98 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="w-full h-full max-w-[1200px] mx-auto space-y-12 pb-20 relative">

            {/* Decorative Background Blur */}
            <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Header & Workspace Switcher */}
            <motion.div variants={cardVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 mb-4">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold tracking-wide uppercase text-zinc-600 dark:text-zinc-400">Environment</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-zinc-900 dark:text-white flex items-center gap-4">
                        Workspace Control
                    </h1>
                    <p className="text-[16px] text-zinc-500 dark:text-zinc-400 mt-4 max-w-xl font-medium leading-relaxed">
                        Manage your team's access, isolated projects, and active experiments in a strictly firewalled environment.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group min-w-[240px]">
                        <select
                            value={activeWorkspace?.id || ""}
                            onChange={(e) => {
                                if (e.target.value === "create_new") {
                                    setIsCreating(true);
                                    e.target.value = activeWorkspace?.id || "";
                                } else {
                                    setActiveWorkspaceId(e.target.value);
                                }
                            }}
                            className="w-full appearance-none bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-white/10 rounded-2xl px-5 py-4 pr-12 text-[14px] font-bold text-zinc-900 dark:text-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] outline-none cursor-pointer focus:ring-4 focus:ring-zinc-100 dark:focus:ring-white/5 transition-all hover:border-zinc-300 dark:hover:border-white/20 hover:scale-[1.02]"
                        >
                            {workspaces.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                            <option value="" disabled>──────────</option>
                            <option value="create_new">+ Create New Workspace</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center pointer-events-none group-hover:bg-zinc-100 dark:group-hover:bg-white/10 transition-colors">
                            <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Empty State / No Workspaces */}
            <AnimatePresence>
                {workspaces.length === 0 && !isCreating && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full flex flex-col items-center justify-center p-20 bg-white/50 dark:bg-zinc-900/20 backdrop-blur-xl border border-dashed border-zinc-300 dark:border-white/10 rounded-[40px] text-center"
                    >
                        <div className="w-24 h-24 mb-8 rounded-[32px] bg-linear-to-br from-zinc-100 to-zinc-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center border border-white/50 dark:border-white/10 shadow-xl rotate-3">
                            <HardDrive className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-3">No active workspace assigned</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mb-10 text-[15px] leading-relaxed">Workspaces are where your team collaborates on product research and planning. Deploy your first isolated environment.</p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="group flex items-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-bold shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                            <Plus className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">Deploy New Workspace</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-zinc-900/20 dark:bg-black/60 backdrop-blur-xl"
                            onClick={() => setIsCreating(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-[420px] overflow-hidden bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-zinc-200/40 dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] bg-blue-400/5 blur-3xl rounded-full dark:bg-blue-500/20 pointer-events-none" />

                            <div className="relative z-10 w-12 h-12 rounded-2xl bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-900/10 flex items-center justify-center mb-4 border border-blue-200/50 dark:border-blue-500/20 shadow-inner">
                                <Building2 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                            </div>

                            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2 relative z-10">Deploy Workspace</h2>
                            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mb-5 relative z-10 font-medium leading-relaxed">Create a secure, isolated environment for your product team's telemetry and experiments.</p>

                            <form onSubmit={handleCreateWorkspace} className="space-y-4 relative z-10">
                                <div>
                                    <label className="text-[12px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 block mb-2 pl-1">Instance Name</label>
                                    <input
                                        type="text"
                                        value={newWsName}
                                        onChange={(e) => setNewWsName(e.target.value)}
                                        placeholder="e.g. Acme Corp internal tools"
                                        className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 rounded-2xl px-5 py-3 text-[14px] font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-400 dark:focus:border-white/30 focus:bg-white dark:focus:bg-[#111] outline-none transition-all shadow-inner"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 block mb-2 pl-1">Context / Description (Optional)</label>
                                    <textarea
                                        value={newWsDesc}
                                        onChange={(e) => setNewWsDesc(e.target.value)}
                                        placeholder="Brief context about this project's purpose..."
                                        className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 rounded-2xl px-5 py-3 text-[14px] font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-400 dark:focus:border-white/30 focus:bg-white dark:focus:bg-[#111] outline-none transition-all resize-none h-20 shadow-inner"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 text-[14px] rounded-2xl text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
                                    <button type="submit" disabled={creatingLoading} className="flex-1 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-[14px] rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_14px_rgba(255,255,255,0.2)] active:scale-95 group relative overflow-hidden">
                                        <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                                        <span className="relative z-10">{creatingLoading ? 'Deploying...' : 'Initialize'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Main Workspace View */}
            {activeWorkspace && !isCreating && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">

                    {/* Members List (Left/Main Column) */}
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div variants={cardVariants} className="bg-white/50 dark:bg-[#0A0A0A] backdrop-blur-2xl border border-zinc-200/80 dark:border-white/5 rounded-[40px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-100 dark:border-white/5">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                                        Team Directory
                                    </h2>
                                    <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">{activeWorkspace.members.length} personnel with authorized access</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {activeWorkspace.members.map((member, index) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        key={member.userId}
                                        className="flex items-center justify-between p-4 rounded-[24px] bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all group border border-zinc-100 dark:border-white/5 shadow-xs"
                                    >
                                        <div className="flex items-center gap-5">
                                            {member.avatar ? (
                                                <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-full border-2 border-white dark:border-white/10 shadow-sm object-cover" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-linear-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-lg font-black text-zinc-700 dark:text-zinc-300 shadow-sm border-2 border-white dark:border-white/10">
                                                    {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-zinc-900 dark:text-white text-[15px] flex items-center gap-2">
                                                    {member.name}
                                                    {member.userId === user?.uid && <span className="text-[10px] font-black tracking-wider uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm">You</span>}
                                                </h4>
                                                <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{member.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {canManageMembers && member.role !== 'owner' && member.userId !== user?.uid ? (
                                                <div className="relative">
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => handleRoleChange(member.userId, e.target.value as any)}
                                                        className={`appearance-none cursor-pointer pl-3 pr-7 py-1.5 rounded-xl text-[11px] font-bold tracking-wide uppercase shadow-inner border outline-none hover:scale-105 active:scale-95 transition-all
                                                            ${member.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : ''}
                                                            ${member.role === 'member' ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:border-white/10' : ''}
                                                            ${member.role === 'viewer' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}
                                                        `}
                                                    >
                                                        {currentUserRole === 'owner' && <option value="owner" className="dark:bg-zinc-900 dark:text-white">Owner</option>}
                                                        <option value="admin" className="dark:bg-zinc-900 dark:text-white">Admin</option>
                                                        <option value="member" className="dark:bg-zinc-900 dark:text-white">Member</option>
                                                        <option value="viewer" className="dark:bg-zinc-900 dark:text-white">Viewer</option>
                                                    </select>
                                                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none transition-colors
                                                        ${member.role === 'admin' ? 'text-blue-500 dark:text-blue-400' : ''}
                                                        ${member.role === 'member' ? 'text-zinc-500 dark:text-zinc-400' : ''}
                                                        ${member.role === 'viewer' ? 'text-emerald-500 dark:text-emerald-400' : ''}
                                                    `} />
                                                </div>
                                            ) : (
                                                <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide uppercase shadow-inner border
                                                    ${member.role === 'owner' ? 'bg-zinc-900 text-white border-zinc-800 dark:bg-white dark:text-black dark:border-white' : ''}
                                                    ${member.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : ''}
                                                    ${member.role === 'member' ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:border-white/10' : ''}
                                                    ${member.role === 'viewer' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}
                                                  `}>
                                                    {member.role === 'owner' && <ShieldCheck className="w-3 h-3 inline mr-1 -mt-0.5" />}
                                                    {member.role}
                                                </span>
                                            )}

                                            {canManageMembers && member.role !== 'owner' && member.userId !== user?.uid && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.userId)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all focus:outline-none"
                                                    title="Revoke access"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column (Details & Invite) */}
                    <div className="space-y-6">

                        {/* Active Workspace Info Card - Holographic feel */}
                        <motion.div variants={cardVariants} className="bg-zinc-900 dark:bg-[#111] rounded-[40px] p-8 relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-zinc-800 dark:border-white/5 group">
                            <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] bg-blue-500/20 blur-[80px] rounded-full group-hover:bg-blue-500/30 transition-colors pointer-events-none" />
                            <div className="absolute -bottom-10 -left-10 w-[60%] h-[60%] bg-purple-500/20 blur-[60px] rounded-full group-hover:bg-purple-500/30 transition-colors pointer-events-none" />

                            <div className="relative z-10">
                                <h3 className="text-[24px] font-black tracking-tight text-white mb-3">{activeWorkspace.name}</h3>
                                {activeWorkspace.description ? (
                                    <p className="text-[14px] font-medium text-zinc-400 leading-relaxed mb-8">{activeWorkspace.description}</p>
                                ) : (
                                    <p className="text-[14px] text-zinc-500 italic mb-8">No description provided for this instance.</p>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                                        <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">Deployed</span>
                                        <span className="text-[13px] font-bold text-zinc-300">{new Date(activeWorkspace.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                                        <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">Security</span>
                                        <span className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-400"><ShieldAlert className="w-3.5 h-3.5" /> High</span>
                                    </div>
                                </div>
                            </div>

                            {currentUserRole === 'owner' && (
                                <div className="mt-8 pt-6 border-t border-red-500/20 relative z-10">
                                    <h4 className="text-[13px] font-bold text-red-500 mb-3">Danger Zone</h4>
                                    <button
                                        onClick={handleDeleteWorkspace}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl transition-colors group"
                                    >
                                        <span className="text-[13px] font-bold text-red-500 dark:text-red-400">Permanently Delete Workspace</span>
                                        <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            )}
                        </motion.div>

                        {/* Invite Members form */}
                        {canManageMembers ? (
                            <motion.div variants={cardVariants} className="bg-white/50 dark:bg-[#0A0A0A] backdrop-blur-2xl border border-zinc-200/80 dark:border-white/5 rounded-[40px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-100/50 dark:bg-white/5 blur-3xl rounded-full pointer-events-none" />

                                <div className="flex items-center gap-4 mb-8 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl border border-zinc-200 dark:border-white/10 flex items-center justify-center bg-white dark:bg-white/5 shadow-sm">
                                        <UserPlus className="w-5 h-5 text-zinc-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-[18px] font-bold tracking-tight text-zinc-900 dark:text-white">Grant Access</h3>
                                        <p className="text-[12px] font-medium text-zinc-500 mt-0.5">Invite secure personnel</p>
                                    </div>
                                </div>

                                <form onSubmit={handleInviteMember} className="space-y-5 relative z-10">
                                    <div className="grid gap-2">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 pl-1">Target Identity</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                placeholder="operative@domain.com"
                                                className="w-full rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-[#111] py-3.5 pl-11 pr-5 text-[14px] font-semibold text-zinc-900 dark:text-white outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:bg-white dark:focus:bg-[#151515] focus:border-zinc-400 dark:focus:border-white/30 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-white/5 shadow-inner"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 pl-1">Authorization Level</label>
                                        <div className="relative">
                                            <select
                                                value={inviteRole}
                                                onChange={(e) => setInviteRole(e.target.value as any)}
                                                className="w-full appearance-none rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-[#111] px-5 py-3.5 text-[14px] font-semibold text-zinc-900 dark:text-white outline-none transition-all cursor-pointer focus:bg-white dark:focus:bg-[#151515] focus:border-zinc-400 dark:focus:border-white/30 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-white/5 shadow-inner"
                                            >
                                                <option value="member">Standard Member</option>
                                                <option value="admin">Administrator</option>
                                                <option value="viewer">Viewer (Read-Only)</option>
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {inviteError && <p className="text-[13px] font-bold text-red-500 mt-2 px-1">{inviteError}</p>}
                                    {inviteSuccess && <p className="text-[13px] font-bold text-emerald-500 flex items-center gap-1.5 mt-2 px-1"><CheckCircle2 className="w-4 h-4" /> {inviteSuccess}</p>}

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={invitingLoading}
                                        className="w-full mt-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl text-[14px] shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_20px_rgba(255,255,255,0.15)] disabled:opacity-50 relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                                        <span className="relative z-10">{invitingLoading ? 'Authorizing...' : 'Dispatch Invitation'}</span>
                                    </motion.button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div variants={cardVariants} className="bg-zinc-50/50 dark:bg-white/5 border border-zinc-200 border-dashed dark:border-white/10 rounded-[40px] p-8 text-center">
                                <div className="w-16 h-16 bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-200 dark:border-white/10 shadow-inner">
                                    <ShieldAlert className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                                </div>
                                <h3 className="text-[16px] font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Restricted Clearance</h3>
                                <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">Owner or Admin clearance is required to grant workspace access.</p>
                            </motion.div>
                        )}

                    </div>
                </div>
            )}

        </motion.div>
    );
}
