import { DBAdapter } from './db-adapter';
import { RoadmapItem, ChangelogEntry } from '@/types/roadmap';
import { checkOllamaHealth, ollamaGenerate } from './ollama';

const ROADMAP_COLLECTION = 'roadmap';
const CHANGELOG_COLLECTION = 'changelog';

/**
 * MODULE 14: PUBLIC ROADMAP & CHANGELOG SERVICE
 */

export const getRoadmapByWorkspace = async (workspaceId: string): Promise<RoadmapItem[]> => {
    return await DBAdapter.getAll(ROADMAP_COLLECTION, { workspaceId });
};

export const getChangelogsByWorkspace = async (workspaceId: string): Promise<ChangelogEntry[]> => {
    return await DBAdapter.getAll(CHANGELOG_COLLECTION, { workspaceId });
};

export const upsertRoadmapItem = async (workspaceId: string, item: Partial<RoadmapItem>) => {
    const id = item.id || Math.random().toString(36).substr(2, 9);
    const data = {
        ...item,
        id,
        workspaceId,
        updatedAt: new Date().toISOString()
    };

    if (item.id) {
        await DBAdapter.update(ROADMAP_COLLECTION, id, data);
    } else {
        await DBAdapter.add(ROADMAP_COLLECTION, data);
    }
    return id;
};

export const deleteRoadmapItem = async (id: string) => {
    await DBAdapter.delete(ROADMAP_COLLECTION, id);
};

export const publishChangelog = async (workspaceId: string, entry: Partial<ChangelogEntry>) => {
    const id = entry.id || Math.random().toString(36).substr(2, 9);
    const data = {
        ...entry,
        id,
        workspaceId,
        updatedAt: new Date().toISOString()
    };

    if (entry.id) {
        await DBAdapter.update(CHANGELOG_COLLECTION, id, data);
    } else {
        await DBAdapter.add(CHANGELOG_COLLECTION, data);
    }
    return id;
};

/**
 * AI AGENT: Auto-generate Changelog from completed features
 */
export const generateAIChangelog = async (workspaceId: string, version: string) => {
    try {
        const ollama = await checkOllamaHealth();
        if (!ollama.available) throw new Error('Ollama not available');

        // Fetch completed features
        const features = await DBAdapter.getAll('features', { workspaceId });
        const completedFeatures = features.filter((f: any) => f.status === 'completed' || f.isDone);

        if (completedFeatures.length === 0) return "No completed features found to generate changelog.";

        const featureList = completedFeatures.map((f: any) => `- ${f.title || f.name}: ${f.description || ''}`).join('\n');

        const prompt = `You are a Technical Product Writer. Generate a premium RELEASE CHANGELOG for version ${version} based on these completed features:
${featureList}

Format the output in professional Markdown with these sections:
## 🚀 Features
## 🛠️ Improvements
## 🐞 Bug Fixes

Keep it exciting and customer-focused. Return ONLY the markdown content.`;

        return await ollamaGenerate(prompt, ollama.model);
    } catch (err) {
        console.error('AI Changelog Generation failed:', err);
        return null;
    }
};
