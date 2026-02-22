import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore, initializeFirestore, memoryLocalCache, Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project-id",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "dummy-messaging-sender",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "dummy-app-id",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "dummy-measurement-id"
};

let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    // Use memoryLocalCache to prevent IndexedDB conflicts between tabs and Next.js Hot Module Reloads
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
} else {
    app = getApp();
    db = getFirestore(app);
}

const auth = getAuth(app);

// Initialize Analytics only on client side where supported
let analytics = null;
if (typeof window !== 'undefined') {
    isSupported().then(yes => yes ? analytics = getAnalytics(app) : null);
}

export { app, auth, db, analytics };
