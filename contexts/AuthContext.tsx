"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onIdTokenChanged } from 'firebase/auth';
import { setCookie, destroyCookie } from 'nookies';
import { auth } from '@/lib/firebase/config';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthModalOpen: boolean;
    openAuthModal: () => void;
    closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAuthModalOpen: false,
    openAuthModal: () => { },
    closeAuthModal: () => { }
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (usr) => {
            if (!usr) {
                setUser(null);
                destroyCookie(null, 'token');
            } else {
                setUser(usr);
                setIsAuthModalOpen(false); // Close modal on successful login
                const token = await usr.getIdToken();
                setCookie(null, 'token', token, {
                    maxAge: 30 * 24 * 60 * 60, // 30 days
                    path: '/',
                });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const openAuthModal = () => setIsAuthModalOpen(true);
    const closeAuthModal = () => setIsAuthModalOpen(false);

    return (
        <AuthContext.Provider value={{ user, loading, isAuthModalOpen, openAuthModal, closeAuthModal }}>
            {children}
        </AuthContext.Provider>
    );
};
