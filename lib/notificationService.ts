import { ref, push, set, onValue, query, orderByChild, equalTo, update, off, get } from 'firebase/database';
import { realtimeDB } from './firebase/config';
import { AppNotification } from '@/types/collaboration';

/**
 * MODULE 11: NOTIFICATION SERVICE
 * Handles real-time notifications via Firebase RTDB
 */

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

export const createNotification = async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const notificationsRef = ref(realtimeDB, 'notifications');
    const newNotifRef = push(notificationsRef);
    const now = new Date().toISOString();

    const newNotif: AppNotification = {
        ...notification,
        id: newNotifRef.key!,
        read: false,
        createdAt: now
    };

    await set(newNotifRef, newNotif);
    return newNotifRef.key;
};

export const markAsRead = async (notifId: string) => {
    const notifRef = ref(realtimeDB, `notifications/${notifId}`);
    await update(notifRef, { read: true });
};

export const deleteNotification = async (notifId: string) => {
    const notifRef = ref(realtimeDB, `notifications/${notifId}`);
    await set(notifRef, null);
};

export const markAllAsRead = async (userId: string) => {
    const notificationsRef = ref(realtimeDB, 'notifications');
    const q = query(notificationsRef, orderByChild('userId'), equalTo(userId));
    const snapshot = await get(q);

    if (snapshot.exists()) {
        const data = snapshot.val();
        const updates: any = {};
        Object.keys(data).forEach(key => {
            if (!data[key].read) {
                updates[`${key}/read`] = true;
            }
        });
        if (Object.keys(updates).length > 0) {
            await update(notificationsRef, updates);
        }
    }
};

/**
 * Utility to notify all members of a workspace except the sender
 */
export const notifyWorkspaceMembers = async (workspaceId: string, senderId: string, title: string, message: string, link?: string) => {
    // 1. Fetch workspace members from localDB
    try {
        const res = await fetch(`/api/localdb?collection=workspaces&id=${workspaceId}`);
        const workspace = await res.json();

        if (workspace && workspace.members) {
            const promises = workspace.members
                .filter((m: any) => m.userId !== senderId)
                .map((m: any) => createNotification({
                    userId: m.userId,
                    type: 'update',
                    title,
                    message,
                    link
                }));
            await Promise.all(promises);
        }
    } catch (err) {
        console.error('Failed to notify workspace members:', err);
    }
};
