"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile, uploadUserAvatar } from '@/lib/firebase/userService';
import { UserProfile as UserProfileType } from '@/types/user';
import { Camera, Save, Loader2, User, Mail, ShieldAlert } from 'lucide-react';

export const UserProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfileType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (user?.uid) {
            getUserProfile(user.uid)
                .then((data) => {
                    if (data) {
                        setProfile(data);
                    } else {
                        // Profile doesn't exist yet, we could initialize it or just wait
                        setProfile({
                            id: user.uid,
                            email: user.email || '',
                            name: user.displayName || '',
                            role: 'pm',
                            preferences: { theme: 'system', notifications: true, language: 'en' },
                            createdAt: new Date(),
                            updatedAt: new Date()
                        } as UserProfileType);
                    }
                })
                .catch((err) => {
                    console.error("Failed to load profile", err);
                    setErrorMsg("Failed to load profile details.");
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user?.uid) return;

        try {
            setSaving(true);
            setErrorMsg('');
            const file = e.target.files[0];
            const downloadURL = await uploadUserAvatar(user.uid, file);
            await updateUserProfile(user.uid, { avatar: downloadURL });

            if (profile) {
                setProfile({ ...profile, avatar: downloadURL });
            }
            setSuccessMsg("Avatar updated successfully!");
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to upload avatar");
        } finally {
            setSaving(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid || !profile) return;

        try {
            setSaving(true);
            setErrorMsg('');
            setSuccessMsg('');

            const updates = {
                name: profile.name,
                role: profile.role,
            };

            await updateUserProfile(user.uid, updates);
            setSuccessMsg("Profile updated successfully!");
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div className="w-full h-full flex items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <p className="text-zinc-500 font-medium">Please sign in to view your profile.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#111111] border border-zinc-200/80 dark:border-zinc-800/80 rounded-[24px] p-6 sm:p-8 max-w-2xl w-full flex-1 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-all">
            <div className="mb-8">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 relative inline-block">
                    Profile Configuration
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 text-[13px] font-medium leading-relaxed">Customize your personal account settings and preferred application role.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 mb-8 items-start sm:items-center">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center relative">
                        {profile?.avatar ? (
                            <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-zinc-400" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={saving}
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{profile?.name || "Anonymous User"}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
                        <Mail className="w-3.5 h-3.5" /> {profile?.email || user.email}
                    </p>
                </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="space-y-4">
                    <div className="grid gap-2 relative">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pl-1">Full Name</label>
                        <input
                            type="text"
                            value={profile?.name || ''}
                            onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                            placeholder="e.g. Maria Garcia"
                            className="w-full rounded-[12px] border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0A0A0A] px-4 py-3 text-[14px] font-medium text-zinc-900 dark:text-white outline-none transition-all placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#111] focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pl-1">Primary Role</label>
                        <div className="relative group">
                            <select
                                value={profile?.role || 'pm'}
                                onChange={(e) => setProfile(prev => prev ? { ...prev, role: e.target.value as any } : null)}
                                className="w-full appearance-none rounded-[12px] border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0A0A0A] px-4 py-3 text-[14px] font-medium text-zinc-900 dark:text-white outline-none transition-all cursor-pointer focus:bg-white dark:focus:bg-[#111] focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50"
                            >
                                <option value="pm">Product Manager</option>
                                <option value="eng">Engineering Lead</option>
                                <option value="design">Product Designer</option>
                                <option value="admin">System Admin</option>
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <ShieldAlert className="w-4 h-4 text-zinc-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {errorMsg && <p className="text-sm font-medium text-red-500">{errorMsg}</p>}
                {successMsg && <p className="text-sm font-medium text-emerald-500">{successMsg}</p>}

                <div className="pt-6 flex justify-end border-t border-zinc-100 dark:border-zinc-800/50 mt-6">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 rounded-[12px] bg-zinc-900 dark:bg-white px-6 py-2.5 font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 text-[13px]"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};
