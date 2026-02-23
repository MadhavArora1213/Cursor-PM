"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkspacesByUser, createWorkspace as apiCreateWorkspace } from "@/lib/firebase/workspaceService";
import { Workspace } from "@/types/workspace";

interface WorkspaceContextType {
    activeWorkspace: Workspace | null;
    workspaces: Workspace[];
    loadingWorkspaces: boolean;
    setActiveWorkspaceId: (id: string) => void;
    refreshWorkspaces: () => Promise<void>;
    createInitialWorkspace: (name: string, description: string) => Promise<string>;
    deleteCurrentWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

    // Load user's workspaces when auth state changes
    const refreshWorkspaces = async () => {
        if (!user) {
            setWorkspaces([]);
            setActiveWorkspace(null);
            setLoadingWorkspaces(false);
            return;
        }

        setLoadingWorkspaces(true);
        try {
            const dbWorkspaces = await getWorkspacesByUser(user.uid);
            setWorkspaces(dbWorkspaces);

            // Check LocalStorage or session to see if they previously selected one
            const savedId = localStorage.getItem("active-workspace");
            if (savedId && dbWorkspaces.find(w => w.id === savedId)) {
                setActiveWorkspace(dbWorkspaces.find(w => w.id === savedId) || null);
            } else if (dbWorkspaces.length > 0) {
                // Fallback to the first one available
                setActiveWorkspace(dbWorkspaces[0]);
                localStorage.setItem("active-workspace", dbWorkspaces[0].id);
            } else {
                setActiveWorkspace(null); // Explicit non-existent
            }
        } catch (error) {
            console.error("Failed to load workspaces:", error);
        } finally {
            setLoadingWorkspaces(false);
        }
    };

    useEffect(() => {
        refreshWorkspaces();
    }, [user]);

    const setActiveWorkspaceId = (id: string) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
            setActiveWorkspace(ws);
            localStorage.setItem("active-workspace", id);
        }
    };

    const createInitialWorkspace = async (name: string, description: string) => {
        if (!user) throw new Error("Unauthenticated user cannot create a workspace");

        const newWsId = await apiCreateWorkspace({
            name,
            description,
            ownerId: user.uid,
            members: [{
                userId: user.uid,
                email: user.email || 'unknown@example.com',
                name: user.displayName || 'Anonymous User',
                avatar: user.photoURL || '',
                role: 'owner',
                joinedAt: new Date()
            }]
        });

        await refreshWorkspaces(); // Reload context
        setActiveWorkspaceId(newWsId);
        return newWsId;
    };

    const deleteCurrentWorkspace = async (id: string) => {
        const { deleteWorkspace } = await import('@/lib/firebase/workspaceService');
        await deleteWorkspace(id);

        // Remove from local state immediately to avoid UI flicker
        setWorkspaces(prev => prev.filter(w => w.id !== id));
        if (activeWorkspace?.id === id) {
            setActiveWorkspace(null);
            localStorage.removeItem('active-workspace');
        }

        await refreshWorkspaces();
    };

    return (
        <WorkspaceContext.Provider value={{
            activeWorkspace,
            workspaces,
            loadingWorkspaces,
            setActiveWorkspaceId,
            refreshWorkspaces,
            createInitialWorkspace,
            deleteCurrentWorkspace
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error("useWorkspace must be used within a WorkspaceProvider");
    }
    return context;
}
