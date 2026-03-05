import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from './config';
import { ResearchItem } from '@/types/research';

export const getDashboardStats = async (workspaceId: string) => {
    try {
        const researchRef = collection(db, 'research');
        const q = query(researchRef, where('workspaceId', '==', workspaceId));
        const snapshot = await getDocs(q);

        const total = snapshot.docs.length;
        const analyzed = snapshot.docs.filter(d => d.data().status === 'analyzed').length;
        const positive = snapshot.docs.filter(d => d.data().sentiment === 'positive').length;

        // Get latest insight
        const latestQuery = query(researchRef, where('workspaceId', '==', workspaceId), where('status', '==', 'analyzed'), orderBy('updatedAt', 'desc'), limit(1));
        const latestSnap = await getDocs(latestQuery);
        const latestItem = latestSnap.docs.length > 0 ? latestSnap.docs[0].data() as ResearchItem : null;

        return {
            totalResearch: total,
            analyzedResearch: analyzed,
            avgSentiment: total > 0 ? Math.round((positive / total) * 100) : 0,
            latestInsight: latestItem ? {
                title: latestItem.title,
                summary: latestItem.summary,
                id: latestSnap.docs[0].id
            } : null
        };
    } catch (error) {
        console.error('Stats error:', error);
        return { totalResearch: 0, analyzedResearch: 0, avgSentiment: 0, latestInsight: null };
    }
};
