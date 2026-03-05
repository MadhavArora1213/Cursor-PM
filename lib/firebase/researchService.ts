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

export const getResearchItemsByIds = async (ids: string[]): Promise<ResearchItem[]> => {
    if (!ids || ids.length === 0) return [];

    // Firestore 'in' queries are limited to 10 elements per query
    const results: ResearchItem[] = [];
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
        chunks.push(ids.slice(i, i + 10));
    }

    const researchRef = collection(db, 'research');
    for (const chunk of chunks) {
        const q = query(researchRef, where('__name__', 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            results.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            } as ResearchItem);
        });
    }
    return results;
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

    // 4. Real AI Analysis — call the Module 5 analysis pipeline
    // This is fire-and-forget from the client side; the API updates Firestore when done.
    fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            itemId: newDocId,
            workspaceId,
            localFilePath: downloadUrl, // e.g. /api/files/{workspaceId}/{fileName}
            fileName: file.name,
        }),
    }).then(res => res.json())
        .then(result => { if (!result.success) console.error('[ANALYZE FAILED]', result.error); })
        .catch(err => console.error('[ANALYZE NETWORK ERROR]', err));

    return newDocId;
};
