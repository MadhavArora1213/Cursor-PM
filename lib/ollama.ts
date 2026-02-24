// =====================================================
// MODULE 5: OLLAMA SERVICE (Qwen Model)
// Local LLM server for AI-powered text generation.
// Requires: ollama running at http://localhost:11434
// Model: qwen2.5 (or qwen2.5:3b for lighter machines)
// =====================================================

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5';

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    total_duration?: number;
    eval_count?: number;
}

/**
 * Check if Ollama is running and which model is available.
 */
export async function checkOllamaHealth(): Promise<{ available: boolean; model: string }> {
    try {
        const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return { available: false, model: DEFAULT_MODEL };

        const data = await res.json();
        const models: { name: string }[] = data.models || [];
        const qwenModel = models.find((m) => m.name.toLowerCase().startsWith('qwen'));
        const bestModel = qwenModel?.name || models[0]?.name || DEFAULT_MODEL;
        return { available: models.length > 0, model: bestModel };
    } catch {
        return { available: false, model: DEFAULT_MODEL };
    }
}

/**
 * Core generate function — sends a prompt to Ollama and returns response text.
 */
export async function ollamaGenerate(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
                temperature: 0.4,
                top_p: 0.9,
                num_predict: 800,
            },
        }),
        signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Ollama error (${res.status}): ${err}`);
    }

    const data: OllamaResponse = await res.json();
    return data.response?.trim() || '';
}

/**
 * Summarize research text using Qwen — returns concise executive summary.
 */
export async function summarizeWithOllama(text: string): Promise<string> {
    const truncated = text.substring(0, 4000);
    const prompt = `You are an expert product manager analyst. Read the following user research text and provide a concise executive summary in 2-4 sentences. Focus on: key user pain points, positive feedback, and actionable insights. Do NOT include any preamble — just write the summary directly.

Research Text:
"""
${truncated}
"""

Executive Summary:`;
    return await ollamaGenerate(prompt);
}

/**
 * Generate hypothesis from research data using Qwen.
 */
export async function generateHypothesesWithOllama(
    topTheme: string,
    researchSummaries: string[],
    analyzedCount: number
): Promise<{ solution: string; benefit: string; need: string }> {
    const context = researchSummaries.slice(0, 5).join('\n\n---\n\n');
    const prompt = `You are a senior product strategist. Based on the research below, generate ONE strong product hypothesis.

Top User Pain Point: "${topTheme}"
Research Summaries:
"""
${context}
"""

Respond ONLY with this JSON (no explanation, no markdown):
{
  "solution": "one concrete action to fix the problem (start with a verb)",
  "benefit": "measurable user outcome",
  "need": "${topTheme} appeared in ${analyzedCount} research items as a primary friction point"
}`;

    const raw = await ollamaGenerate(prompt);
    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                solution: parsed.solution || `redesign the ${topTheme.toLowerCase()} flow`,
                benefit: parsed.benefit || `user satisfaction increases by 30%`,
                need: parsed.need || `${topTheme} was the top friction point`,
            };
        }
    } catch { /* fallback below */ }
    return {
        solution: `redesign and simplify the ${topTheme.toLowerCase()} experience`,
        benefit: `user satisfaction and task completion rate will increase by 30%`,
        need: `${topTheme} appeared in ${analyzedCount} research items as a top concern`,
    };
}

/**
 * Generate user stories using Qwen.
 */
export async function generateUserStoriesWithOllama(
    solution: string,
    topTheme: string
): Promise<string[]> {
    const prompt = `You are a product manager writing user stories. Generate exactly 3 user stories (in "As a..., I want..., so that..." format) for this product improvement:

Improvement: ${solution}
Theme: ${topTheme}

Respond with ONLY a JSON array of 3 strings:
["As a new user...", "As a product manager...", "As a team member..."]`;

    const raw = await ollamaGenerate(prompt);
    try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { /* fallback below */ }
    return [
        `As a new user, I want a clear ${topTheme.toLowerCase()} walkthrough so I can complete my first task without confusion.`,
        `As a product manager, I want to see real-time metrics on ${topTheme.toLowerCase()} so I can identify and resolve bottlenecks quickly.`,
        `As a team member, I want streamlined ${topTheme.toLowerCase()} workflows so I can collaborate efficiently without friction.`,
    ];
}

/**
 * Generate OKRs using Qwen.
 */
export async function generateOKRsWithOllama(
    objective: string,
    topTheme: string
): Promise<{ objective: string; keyResults: string[] }[]> {
    const prompt = `You are an OKR coach. Generate 1 OKR for this product goal.

Objective: ${objective}
Theme: ${topTheme}

Respond ONLY with this JSON:
[{
  "objective": "clear, inspiring objective statement",
  "keyResults": [
    "measurable KR 1 with specific metric",
    "measurable KR 2 with specific metric",
    "measurable KR 3 with specific metric"
  ]
}]`;

    const raw = await ollamaGenerate(prompt);
    try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { /* fallback below */ }
    return [{
        objective: `Resolve the top user pain point: ${topTheme}`,
        keyResults: [
            `Reduce user-reported issues related to ${topTheme.toLowerCase()} by 50% by Q2`,
            `Increase NPS score from baseline by +15 points within 60 days of launch`,
            `Achieve 80% task completion rate on redesigned flow in user testing`,
        ],
    }];
}
