import { DBAdapter } from '../db-adapter';
import { ResearchItem } from '@/types/research';

export interface DashboardStats {
    totalResearch: number;
    analyzedResearch: number;
    avgSentiment: number;
    latestInsight: {
        title: string;
        summary: string;
        id: string;
    } | null;
    totalFeatures: number;
    highPriorityFeatures: number;
    totalExperiments: number;
    completedExperiments: number;
    totalSpecs: number;
    recentActivity: {
        id: string;
        title: string;
        type: 'research' | 'feature' | 'experiment' | 'spec';
        timestamp: string;
    }[];
}

export const getDashboardStats = async (workspaceId: string): Promise<DashboardStats> => {
    try {
        const [research, features, experiments, specs] = await Promise.all([
            DBAdapter.getAll('research', { workspaceId }),
            DBAdapter.getAll('features', { workspaceId }),
            DBAdapter.getAll('experiments', { workspaceId }),
            DBAdapter.getAll('technical_specs', { workspaceId })
        ]);

        // Research Stats
        const analyzed = research.filter(d => d.status === 'analyzed');
        const positive = research.filter(d => d.sentiment === 'positive').length;

        // Features Stats
        const highPriority = features.filter((f: any) => f.impact === 'high' || f.priority === 'high').length;

        // Experiments Stats
        const completed = experiments.filter((e: any) => e.status === 'completed' || e.results).length;

        // Latest Insight
        const latestItem = analyzed
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] as ResearchItem;

        // Activity Feed (Top 5)
        const activity: any[] = [
            ...research.map(r => ({ id: r.id, title: r.title, type: 'research', timestamp: r.updatedAt })),
            ...features.map(f => ({ id: f.id, title: f.title || f.name, type: 'feature', timestamp: f.updatedAt })),
            ...experiments.map(e => ({ id: e.id, title: e.title, type: 'experiment', timestamp: e.updatedAt })),
            ...specs.map(s => ({ id: s.id, title: s.title, type: 'spec', timestamp: s.metadata?.updatedAt || s.updatedAt }))
        ]
            .filter(a => a.timestamp)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);

        return {
            totalResearch: research.length,
            analyzedResearch: analyzed.length,
            avgSentiment: research.length > 0 ? Math.round((positive / research.length) * 100) : 0,
            latestInsight: latestItem ? {
                title: latestItem.title,
                summary: latestItem.summary || '',
                id: latestItem.id
            } : null,
            totalFeatures: features.length,
            highPriorityFeatures: highPriority,
            totalExperiments: experiments.length,
            completedExperiments: completed,
            totalSpecs: specs.length,
            recentActivity: activity
        };
    } catch (error) {
        console.error('Stats aggregation error:', error);
        return {
            totalResearch: 0,
            analyzedResearch: 0,
            avgSentiment: 0,
            latestInsight: null,
            totalFeatures: 0,
            highPriorityFeatures: 0,
            totalExperiments: 0,
            completedExperiments: 0,
            totalSpecs: 0,
            recentActivity: []
        };
    }
};
