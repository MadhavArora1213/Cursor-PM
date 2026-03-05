import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './config';

export interface CanvasCard {
    id: string;
    type: 'research' | 'insight' | 'feature' | 'roadmap' | 'note' | 'ai-output';
    title: string;
    content: string;
    color: string;
    x: number;
    y: number;
    width: number;
    meta?: Record<string, string>;
}

export interface CanvasBoard {
    id: string;
    workspaceId: string;
    cards: CanvasCard[];
    updatedAt: any;
}

export const saveCanvasBoard = async (workspaceId: string, cards: CanvasCard[]) => {
    const boardRef = doc(db, 'canvas_boards', workspaceId);
    await setDoc(boardRef, {
        workspaceId,
        cards,
        updatedAt: new Date()
    }, { merge: true });
};

export const getCanvasBoard = async (workspaceId: string): Promise<CanvasCard[] | null> => {
    const boardRef = doc(db, 'canvas_boards', workspaceId);
    const snap = await getDoc(boardRef);
    if (snap.exists()) {
        return snap.data().cards as CanvasCard[];
    }
    return null;
};
