import { UserProfile } from '@/types/user';
import { DBAdapter } from '../db-adapter';

const COLLECTION = 'users';

export const createUserProfile = async (userData: Partial<UserProfile>) => {
    if (!userData.id) throw new Error("User ID is required");

    const now = new Date();
    const newUser = {
        ...userData,
        preferences: {
            theme: 'system',
            notifications: true,
            language: 'en',
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };

    return await DBAdapter.add(COLLECTION, newUser);
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const data = await DBAdapter.getById(COLLECTION, userId);
    if (!data) return null;
    return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
    } as UserProfile;
}

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    const processedUpdates: any = { ...updates };
    processedUpdates.updatedAt = new Date().toISOString();
    await DBAdapter.update(COLLECTION, userId, processedUpdates);
};

export const uploadUserAvatar = async (userId: string, file: File) => {
    // Re-using the /api/upload mechanism for avatars
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', 'avatars'); // Use 'avatars' as a special workspace name

    const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!uploadResponse.ok) {
        throw new Error('Failed to upload avatar locally');
    }

    const uploadData = await uploadResponse.json();
    const downloadURL = uploadData.fileUrl;

    // Update profile with new avatar URL
    await updateUserProfile(userId, { avatar: downloadURL });
    return downloadURL;
};
