import { upsertResearchDocument } from './vectorService';
import { DBAdapter } from './db-adapter';
import { ResearchItem } from '@/types/research';
import { Experiment } from '@/types/validation';

/**
 * MODULE 9: KNOWLEDGE INDEXING SERVICE
 * Aggregates data from Research, Strategy, and Validation modules
 * and pushes them into the global semantic vector store.
 */

export async function syncWorkspaceKnowledge(workspaceId: string) {
    console.log(`[KNOWLEDGE SYNC] Starting sync for workspace: ${workspaceId}`);

    // 1. Fetch Research Items (LocalDB via DBAdapter)
    const researchItems: ResearchItem[] = await DBAdapter.getAll('research', { workspaceId });
    for (const item of researchItems) {
        if (item.status === 'analyzed' || item.content) {
            await upsertResearchDocument(item.id, item.summary || item.content || '', {
                workspaceId,
                title: item.title,
                type: 'research',
                sourceType: item.type,
                uploaderId: item.uploaderId
            });
        }
    }

    // 2. Fetch Experiments (LocalDB via DBAdapter)
    const experiments: Experiment[] = await DBAdapter.getAll('experiments', { workspaceId });
    for (const exp of experiments) {
        const content = `Experiment: ${exp.title}\nHypothesis: ${exp.hypothesis}\nDesign: ${exp.design}\nConclusion: ${exp.results?.conclusion || 'Analysis pending'}`;
        await upsertResearchDocument(exp.id, content, {
            workspaceId,
            title: exp.title,
            type: 'experiment',
            status: exp.status
        });
    }

    // 3. Fetch Features/Backlog (Strategy)
    const features = await DBAdapter.getAll('features', { workspaceId });
    for (const feat of features) {
        const content = `Feature: ${feat.title}\nDescription: ${feat.description}\nImpact: ${feat.impact}\nStories: ${(feat.userStories || []).join('; ')}`;
        await upsertResearchDocument(feat.id, content, {
            workspaceId,
            title: feat.title,
            type: 'feature',
            priority: feat.impact || 'medium'
        });
    }

    // 4. Fetch OKRs
    const okrs = await DBAdapter.getAll('okrs', { workspaceId });
    for (const okr of okrs) {
        const content = `OKR: ${okr.objective}\nKey Results: ${(okr.keyResults || []).map((k: any) => k.title || k).join('; ')}\nStatus: ${okr.status || 'active'}`;
        await upsertResearchDocument(okr.id, content, {
            workspaceId,
            title: okr.objective,
            type: 'okr',
            quarter: okr.quarter || 'unknown'
        });
    }

    // 5. Fetch Strategy (Unified documents)
    const strategies = await DBAdapter.getAll('strategies', { workspaceId });
    for (const strat of strategies) {
        const hypothesis = strat.hypothesis;
        if (hypothesis) {
            const content = `Strategy Hypothesis: ${hypothesis.title}\nSolution: ${hypothesis.solution}\nBenefit: ${hypothesis.benefit}`;
            await upsertResearchDocument(strat.id, content, {
                workspaceId,
                title: hypothesis.title,
                type: 'strategy',
                status: hypothesis.status
            });
        }
    }

    console.log(`[KNOWLEDGE SYNC] Completed sync for workspace: ${workspaceId}`);
    return { success: true };
}
