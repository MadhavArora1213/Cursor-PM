import { auth, db } from './config';
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const saveUserToFirestore = async (user: User) => {
    if (!user) return;
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            lastLogin: serverTimestamp(),
            // When signing up via provider, this saves info. When signing in, it merges & updates lastLogin.
        }, { merge: true });
    } catch (error) {
        console.error("Error saving user to firestore:", error);
    }
};

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        if (result.user) await saveUserToFirestore(result.user);
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
        if (result.user) await saveUserToFirestore(result.user);
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
        if (result.user) await saveUserToFirestore(result.user);
        return result.user;
    } catch (error: any) {
        console.error("Error signing in with Email", error);
        throw error;
    }
};

export const signUpWithEmail = async (email: string, pass: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        if (result.user) await saveUserToFirestore(result.user);
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

