import { ResearchItem } from '@/types/research';
import { DBAdapter } from '../db-adapter';

const COLLECTION = 'research';

export const createResearchItem = async (data: Omit<ResearchItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const newResearch = {
        ...data,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
    return await DBAdapter.add(COLLECTION, newResearch);
};

export const getResearchByWorkspace = async (workspaceId: string): Promise<ResearchItem[]> => {
    const data = await DBAdapter.getAll(COLLECTION, { workspaceId });
    return data.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
    } as ResearchItem)).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const getResearchItemsByIds = async (ids: string[]): Promise<ResearchItem[]> => {
    if (!ids || ids.length === 0) return [];

    // In LocalDB via DBAdapter, we can fetch by ID
    const results: ResearchItem[] = [];
    for (const id of ids) {
        const item = await DBAdapter.getById(COLLECTION, id);
        if (item) {
            results.push({
                ...item,
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt),
            } as ResearchItem);
        }
    }
    return results;
};

export const deleteResearchItem = async (itemId: string, fileUrl?: string) => {
    await DBAdapter.delete(COLLECTION, itemId);

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
        status: 'processing',
        fileUrl: downloadUrl,
        fileName: file.name,
    });

    // 4. Real AI Analysis
    fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            itemId: newDocId,
            workspaceId,
            localFilePath: downloadUrl,
            fileName: file.name,
        }),
    }).then(res => res.json())
        .then(result => { if (!result.success) console.error('[ANALYZE FAILED]', result.error); })
        .catch(err => console.error('[ANALYZE NETWORK ERROR]', err));

    return newDocId;
};
