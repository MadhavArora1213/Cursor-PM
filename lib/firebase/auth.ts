import { auth } from './config';
import {
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut as firebaseSignOut,
    User
} from 'firebase/auth';
import { LocalDBService } from '../localDBService';

const saveUserToLocalDB = async (user: User) => {
    if (!user) return;
    try {
        const userData = {
            id: user.uid,
            uid: user.uid,
            email: user.email,
            name: user.displayName || '',
            avatar: user.photoURL || '',
            lastLogin: new Date().toISOString(),
        };

        // Check if user exists
        const existing = await LocalDBService.getById('users', user.uid);
        if (existing) {
            await LocalDBService.update('users', user.uid, userData);
        } else {
            await LocalDBService.add('users', userData);
        }
    } catch (error) {
        console.error("Error saving user to LocalDB:", error);
    }
};

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        if (result.user) await saveUserToLocalDB(result.user);
        return result.user;
    } catch (error: any) {
        if (error.message.includes('dummy-')) {
            alert("Please configure your Firebase credentials in .env.local");
        }
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const signInWithGitHub = async () => {
    const provider = new GithubAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        if (result.user) await saveUserToLocalDB(result.user);
        return result.user;
    } catch (error: any) {
        if (error.message.includes('dummy-')) {
            alert("Please configure your Firebase credentials in .env.local");
        }
        console.error("Error signing in with GitHub", error);
        throw error;
    }
};

export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
};

export const signInWithEmail = async (email: string, pass: string) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        if (result.user) await saveUserToLocalDB(result.user);
        return result.user;
    } catch (error: any) {
        console.error("Error signing in with Email", error);
        throw error;
    }
};

export const signUpWithEmail = async (email: string, pass: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        if (result.user) await saveUserToLocalDB(result.user);
        return result.user;
    } catch (error: any) {
        console.error("Error signing up with Email", error);
        throw error;
    }
};

export const resetPassword = async (email: string) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
        console.error("Error sending password reset email", error);
        throw error;
    }
};
