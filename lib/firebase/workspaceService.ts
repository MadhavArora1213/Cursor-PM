import { doc, setDoc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './config';
import { Workspace, WorkspaceMember } from '@/types/workspace';

// Helper to look up a user by their email
export const getUserByEmail = async (email: string) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as any; // Using generic any to avoid importing full UserProfile here if not needed
};

// Create a new bare-minimum workspace
export const createWorkspace = async (workspaceData: Partial<Workspace>) => {
    const workspacesRef = collection(db, 'workspaces');

    // Create a clean date for timestamps
    const now = new Date();

    const newWorkspace = {
        ...workspaceData,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await addDoc(workspacesRef, newWorkspace);
    return docRef.id;
};

// Fetch a single workspace
export const getWorkspace = async (workspaceId: string): Promise<Workspace | null> => {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    if (workspaceSnap.exists()) {
        const data = workspaceSnap.data();
        return {
            id: workspaceSnap.id,
            ...data,
            // Convert firestore timestamps to dates for the client
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Workspace;
    }
    return null;
};

// Update workspace details (name, description, etc)
export const updateWorkspace = async (workspaceId: string, updates: Partial<Workspace>) => {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await updateDoc(workspaceRef, {
        ...updates,
        updatedAt: new Date(),
    });
};

// Delete a workspace
export const deleteWorkspace = async (workspaceId: string) => {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await deleteDoc(workspaceRef);
};

// Add a brand new member to an existing workspace
export const addWorkspaceMember = async (workspaceId: string, memberData: WorkspaceMember | Omit<WorkspaceMember, 'joinedAt'>) => {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Check if they are already in the array
    if (workspace.members.some(m => m.userId === memberData.userId)) {
        throw new Error("User is already a member of this workspace.");
    }

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await updateDoc(workspaceRef, {
        members: [...workspace.members, { ...memberData, joinedAt: new Date() }],
        updatedAt: new Date(),
    });
};

// Remove a member or leave a workspace
export const removeWorkspaceMember = async (workspaceId: string, userIdToRemove: string) => {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const filteredMembers = workspace.members.filter(m => m.userId !== userIdToRemove);

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await updateDoc(workspaceRef, {
        members: filteredMembers,
        updatedAt: new Date(),
    });
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

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await updateDoc(workspaceRef, {
        members: updatedMembers,
        updatedAt: new Date(),
    });
};

// Fetch all workspaces that a specific user is a part of
export const getWorkspacesByUser = async (userId: string): Promise<Workspace[]> => {
    const workspacesRef = collection(db, 'workspaces');

    // Query where the members array contains an object that has this userId
    // Wait! Firestore "array-contains" strictly matches the FULL object instance.
    // We can't query "array-contains" for just `userId` inside an array of objects easily.
    // Instead, let's keep it simple: We'll query all workspaces and filter client-side, OR we can store a separate `memberIds: string[]` array just for querying.

    // Workaround since we are early: We pull all workspaces and filter. Note: Not scalable for production, but perfect for MVP until we add `memberIds`.
    const querySnapshot = await getDocs(workspacesRef);
    const workspaces: Workspace[] = [];

    querySnapshot.forEach(doc => {
        const data = doc.data();
        const isMember = data.members?.some((m: any) => m.userId === userId);
        if (isMember) {
            workspaces.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Workspace);
        }
    });

    // Sort by created date descending
    return workspaces.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};
