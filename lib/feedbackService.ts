import { DBAdapter } from './db-adapter';
import { UserFeedback } from '@/types/feedback';
import { checkOllamaHealth, ollamaGenerate } from './ollama';

const COLLECTION = 'feedback';

/**
 * MODULE 13: AGENTIC FEEDBACK TRIAGE SERVICE
 */

export const getFeedbackByWorkspace = async (workspaceId: string): Promise<UserFeedback[]> => {
    return await DBAdapter.getAll(COLLECTION, { workspaceId });
};

export const createFeedbackEntry = async (data: Partial<UserFeedback>) => {
    const now = new Date().toISOString();
    const entry = {
        ...data,
        status: 'new',
        createdAt: now,
        id: Math.random().toString(36).substr(2, 9) // LocalDB generates ID if missing, but we can be explicit
    };
    const id = await DBAdapter.add(COLLECTION, entry);

    // Trigger Async Triage
    triageFeedbackAgent(id, entry.rawContent || '');

    return id;
};

export const triageFeedbackAgent = async (feedbackId: string, content: string) => {
    try {
        const ollama = await checkOllamaHealth();
        if (!ollama.available) return;

        const prompt = `You are an AI Product Triage Agent. Analyze this user feedback:
"${content}"

Return ONLY a JSON object with this structure:
{
  "summary": "One sentence summary",
  "tags": ["tag1", "tag2"],
  "sentiment": 0.5 (range -1 to 1)
}

JSON:`;

        const response = await ollamaGenerate(prompt, ollama.model);
        const jsonContent = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonContent);

        await DBAdapter.update(COLLECTION, feedbackId, {
            aiSummary: analysis.summary,
            aiTags: analysis.tags,
            sentimentScore: analysis.sentiment,
            status: 'triaged',
            processedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('[TRIAGE AGENT ERROR]', err);
    }
};

export const linkFeedbackToFeature = async (feedbackId: string, featureId: string) => {
    await DBAdapter.update(COLLECTION, feedbackId, {
        linkedFeatureId: featureId,
        status: 'linked'
    });
};
