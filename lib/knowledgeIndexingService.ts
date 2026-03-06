import { upsertResearchDocument, deleteResearchDocument } from './vectorService';
import { getResearchByWorkspace } from './firebase/researchService';
import { getExperimentsByWorkspace } from './firebase/validationService';
import { db } from './firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * MODULE 9: KNOWLEDGE INDEXING SERVICE
 * Aggregates data from Research, Strategy, and Validation modules
 * and pushes them into the global semantic vector store.
 */

export async function syncWorkspaceKnowledge(workspaceId: string) {
    console.log(`[KNOWLEDGE SYNC] Starting sync for workspace: ${workspaceId}`);

    // 1. Fetch Research Items
    const researchItems = await getResearchByWorkspace(workspaceId);
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

    // 2. Fetch Experiments
    const experiments = await getExperimentsByWorkspace(workspaceId);
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
    const featuresQuery = query(collection(db, 'features'), where('workspaceId', '==', workspaceId));
    const featuresSnap = await getDocs(featuresQuery);
    for (const doc of featuresSnap.docs) {
        const data = doc.data();
        const content = `Feature: ${data.title}\nDescription: ${data.description}\nImpact: ${data.impact}\nStories: ${(data.userStories || []).join('; ')}`;
        await upsertResearchDocument(doc.id, content, {
            workspaceId,
            title: data.title,
            type: 'feature',
            priority: data.impact || 'medium'
        });
    }

    // 4. Fetch OKRs
    const okrsQuery = query(collection(db, 'okrs'), where('workspaceId', '==', workspaceId));
    const okrsSnap = await getDocs(okrsQuery);
    for (const doc of okrsSnap.docs) {
        const data = doc.data();
        const content = `OKR: ${data.objective}\nKey Results: ${(data.keyResults || []).map((k: any) => k.title).join('; ')}\nStatus: ${data.status || 'active'}`;
        await upsertResearchDocument(doc.id, content, {
            workspaceId,
            title: data.objective,
            type: 'okr',
            quarter: data.quarter || 'unknown'
        });
    }

    console.log(`[KNOWLEDGE SYNC] Completed sync for workspace: ${workspaceId}`);
    return { success: true };
}
