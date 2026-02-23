import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';
import { ResearchItem } from '@/types/research';

export const createResearchItem = async (data: Omit<ResearchItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'research'), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
};

export const getResearchByWorkspace = async (workspaceId: string): Promise<ResearchItem[]> => {
    const researchRef = collection(db, 'research');
    const q = query(researchRef, where('workspaceId', '==', workspaceId));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ResearchItem;
    });
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const deleteResearchItem = async (itemId: string, fileUrl?: string) => {
    const itemRef = doc(db, 'research', itemId);
    await deleteDoc(itemRef);

    // Attempt to delete from local storage API if there's a file
    if (fileUrl && fileUrl.startsWith('/api/files/')) {
        try {
            await fetch(fileUrl, { method: 'DELETE' });
        } catch (error) {
            console.warn("Local storage deletion warning:", error);
        }
    }
};

export const uploadResearchDocument = async (workspaceId: string, uploaderId: string, file: File, description: string) => {
    // 1. Local Next.js API Upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspaceId);

    const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!uploadResponse.ok) {
        throw new Error('Failed to upload file locally');
    }

    const uploadData = await uploadResponse.json();
    const downloadUrl = uploadData.fileUrl;

    // 2. Type Inference
    let type: 'audio' | 'document' | 'text' = 'document';
    if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.type === 'text/plain') type = 'text';

    // 3. Database Entry (Status: Processing)
    const newDocId = await createResearchItem({
        workspaceId,
        uploaderId,
        title: file.name,
        description,
        type,
        status: 'processing', // Shows a loading state in UI immediately
        fileUrl: downloadUrl,
        fileName: file.name,
    });

    // 4. Mock AI Analysis Delay (This would be an API call to Python backend)
    setTimeout(async () => {
        const itemRef = doc(db, 'research', newDocId);
        await updateDoc(itemRef, {
            status: 'analyzed',
            summary: "AI Simulated Summary: User sentiment highlights the need for a faster workflow. They complained about the UI complexity but loved the new dashboard analytics.",
            sentiment: Math.random() > 0.5 ? 'positive' : 'mixed',
            updatedAt: new Date()
        });
    }, 7000); // Wait 7 seconds then turn green in the UI

    return newDocId;
};
