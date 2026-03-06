import { ref, push, set, onValue, query, orderByChild, equalTo, remove, update, off, get } from 'firebase/database';
import { realtimeDB } from './config';
import { Comment, WorkshopSession, AppNotification } from '@/types/collaboration';
import { notifyWorkspaceMembers } from '../notificationService';

// --- COMMENTS (RTDB) ---
export const subscribeToComments = (itemType: string, itemId: string, callback: (comments: Comment[]) => void) => {
    const commentsRef = ref(realtimeDB, 'comments');
    const q = query(commentsRef, orderByChild('itemId'), equalTo(itemId));

    // Listen for changes
    const listener = onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback([]);
            return;
        }

        const comments = Object.keys(data)
            .map(key => ({ id: key, ...data[key] }))
            .filter(c => c.itemType === itemType)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        callback(comments);
    });

    return () => off(q, 'value', listener);
};


export const addComment = async (comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const commentsRef = ref(realtimeDB, 'comments');
    const newCommentRef = push(commentsRef);
    const now = new Date().toISOString();

    const newComment: Comment = {
        ...comment,
        id: newCommentRef.key!,
        createdAt: now,
        updatedAt: now
    };

    await set(newCommentRef, newComment);

    // Notify others in workspace
    await notifyWorkspaceMembers(
        comment.workspaceId,
        comment.authorId,
        'New Comment',
        `${comment.authorName} left a comment on a ${comment.itemType}.`,
        '/dashboard/collaboration'
    );

    return newCommentRef.key;
};

export const deleteComment = async (commentId: string) => {
    const commentRef = ref(realtimeDB, `comments/${commentId}`);
    await remove(commentRef);
};

// --- WORKSHOPS/SESSIONS (RTDB) ---
export const subscribeToWorkshops = (workspaceId: string, callback: (workshops: WorkshopSession[]) => void) => {
    const workshopsRef = ref(realtimeDB, 'workshops');
    const q = query(workshopsRef, orderByChild('workspaceId'), equalTo(workspaceId));

    const listener = onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback([]);
            return;
        }

        const workshops = Object.keys(data)
            .map(key => ({ id: key, ...data[key] }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        callback(workshops);
    });

    return () => off(q, 'value', listener);
};

export const createWorkshop = async (workshop: Omit<WorkshopSession, 'id' | 'createdAt' | 'status'>) => {
    const workshopsRef = ref(realtimeDB, 'workshops');
    const newWorkshopRef = push(workshopsRef);
    const now = new Date().toISOString();

    const newWorkshop: WorkshopSession = {
        ...workshop,
        id: newWorkshopRef.key!,
        status: 'planned',
        createdAt: now
    };

    await set(newWorkshopRef, newWorkshop);
    return newWorkshopRef.key;
};

export const updateWorkshopWhiteboard = async (workshopId: string, whiteboardData: any) => {
    const workshopRef = ref(realtimeDB, `workshops/${workshopId}`);
    await update(workshopRef, {
        whiteboardData,
        updatedAt: new Date().toISOString()
    });
};

export const startWorkshop = async (workshopId: string) => {
    const workshopRef = ref(realtimeDB, `workshops/${workshopId}`);
    await update(workshopRef, {
        status: 'active',
        startTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
};

export const endWorkshop = async (workshopId: string) => {
    const workshopRef = ref(realtimeDB, `workshops/${workshopId}`);
    await update(workshopRef, {
        status: 'completed',
        endTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
};

export const joinWorkshop = async (workshopId: string, userId: string) => {
    const workshopRef = ref(realtimeDB, `workshops/${workshopId}`);
    const snapshot = await get(workshopRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const participants = data.participants || [];
        if (!participants.includes(userId)) {
            await update(workshopRef, {
                participants: [...participants, userId]
            });
        }
    }
};

// --- NOTIFICATIONS (RTDB) ---
export const subscribeToNotifications = (userId: string, callback: (notifications: AppNotification[]) => void) => {
    const notificationsRef = ref(realtimeDB, 'notifications');
    const q = query(notificationsRef, orderByChild('userId'), equalTo(userId));

    const listener = onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback([]);
            return;
        }

        const notifications = Object.keys(data)
            .map(key => ({ id: key, ...data[key] }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        callback(notifications);
    });

    return () => off(q, 'value', listener);
};

export const markNotificationRead = async (notificationId: string) => {
    const notificationRef = ref(realtimeDB, `notifications/${notificationId}`);
    await update(notificationRef, { read: true });
};
