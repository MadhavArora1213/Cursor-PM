import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { UserProfile } from '@/types/user';

export const createUserProfile = async (userData: Partial<UserProfile>) => {
    if (!userData.id) throw new Error("User ID is required");
    const userRef = doc(db, 'users', userData.id);

    await setDoc(userRef, {
        ...userData,
        preferences: {
            theme: 'system',
            notifications: true,
            language: 'en',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    });
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as UserProfile;
    }
    return null;
}

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date(),
    });
};

export const uploadUserAvatar = async (userId: string, file: File) => {
    const storageRef = ref(storage, `avatars/${userId}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
};
