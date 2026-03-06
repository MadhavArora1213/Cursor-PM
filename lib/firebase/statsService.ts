import { DBAdapter } from '../db-adapter';
import { ResearchItem } from '@/types/research';

export const getDashboardStats = async (workspaceId: string) => {
    try {
        const items = await DBAdapter.getAll('research', { workspaceId });

        const total = items.length;
        const analyzed = items.filter(d => d.status === 'analyzed').length;
        const positive = items.filter(d => d.sentiment === 'positive').length;

        // Get latest insight
        const analyzedItems = items
            .filter(d => d.status === 'analyzed')
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        const latestItem = analyzedItems.length > 0 ? analyzedItems[0] as ResearchItem : null;

        return {
            totalResearch: total,
            analyzedResearch: analyzed,
            avgSentiment: total > 0 ? Math.round((positive / total) * 100) : 0,
            latestInsight: latestItem ? {
                title: latestItem.title,
                summary: latestItem.summary,
                id: latestItem.id
            } : null
        };
    } catch (error) {
        console.error('Stats error:', error);
        return { totalResearch: 0, analyzedResearch: 0, avgSentiment: 0, latestInsight: null };
    }
};
