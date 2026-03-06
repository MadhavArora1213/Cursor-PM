import { Workspace, WorkspaceMember } from '@/types/workspace';
import { DBAdapter } from '../db-adapter';

const COLLECTION = 'workspaces';

// Helper to look up a user by their email
export const getUserByEmail = async (email: string) => {
    const users = await DBAdapter.getAll('users');
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    return user || null;
};

// Create a new bare-minimum workspace
export const createWorkspace = async (workspaceData: Partial<Workspace>) => {
    const now = new Date();
    const newWorkspace = {
        ...workspaceData,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
    return await DBAdapter.add(COLLECTION, newWorkspace);
};

// Fetch a single workspace
export const getWorkspace = async (workspaceId: string): Promise<Workspace | null> => {
    const data = await DBAdapter.getById(COLLECTION, workspaceId);
    if (!data) return null;
    return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        members: data.members?.map((m: any) => ({
            ...m,
            joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date()
        })) || []
    } as Workspace;
};

// Update workspace details (name, description, etc)
export const updateWorkspace = async (workspaceId: string, updates: Partial<Workspace>) => {
    const processedUpdates: any = { ...updates };
    processedUpdates.updatedAt = new Date().toISOString();
    await DBAdapter.update(COLLECTION, workspaceId, processedUpdates);
};

// Delete a workspace
export const deleteWorkspace = async (workspaceId: string) => {
    await DBAdapter.delete(COLLECTION, workspaceId);
};

// Add a brand new member to an existing workspace
export const addWorkspaceMember = async (workspaceId: string, memberData: WorkspaceMember | Omit<WorkspaceMember, 'joinedAt'>) => {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    if (workspace.members.some(m => m.userId === memberData.userId)) {
        throw new Error("User is already a member of this workspace.");
    }

    const updatedMembers = [...workspace.members, { ...memberData, joinedAt: new Date().toISOString() }];
    await updateWorkspace(workspaceId, { members: updatedMembers as any });
};

// Remove a member or leave a workspace
export const removeWorkspaceMember = async (workspaceId: string, userIdToRemove: string) => {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const filteredMembers = workspace.members.filter(m => m.userId !== userIdToRemove);
    await updateWorkspace(workspaceId, { members: filteredMembers as any });
};

// Update a member's role
export const updateWorkspaceMemberRole = async (workspaceId: string, targetUserId: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') => {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const updatedMembers = workspace.members.map(m => {
        if (m.userId === targetUserId) {
            return { ...m, role: newRole };
        }
        return m;
    });

    await updateWorkspace(workspaceId, { members: updatedMembers as any });
};

// Fetch all workspaces that a specific user is a part of
export const getWorkspacesByUser = async (userId: string): Promise<Workspace[]> => {
    const data = await DBAdapter.getAll(COLLECTION, { userId });
    return data.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        members: item.members?.map((m: any) => ({
            ...m,
            joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date()
        })) || []
    } as Workspace)).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
};
