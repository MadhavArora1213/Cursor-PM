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
 * Prioritizes smaller/faster "3b" or "1.5b" models to prevent 5+ minute generation times on typical hardware.
 */
export async function checkOllamaHealth(): Promise<{ available: boolean; model: string }> {
    try {
        const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
            cache: 'no-store'
        });
        if (!res.ok) return { available: false, model: DEFAULT_MODEL };

        const data = await res.json();
        const models: { name: string }[] = data.models || [];

        // 1. Try to find the ultra-fast 3b or 1.5b sizes first
        const fastModel = models.find((m) => m.name.includes('3b') || m.name.includes('1.5b') || m.name.includes('0.5b'));
        // 2. Otherwise grab any Qwen model
        const qwenModel = models.find((m) => m.name.toLowerCase().startsWith('qwen'));

        const bestModel = fastModel?.name || qwenModel?.name || models[0]?.name || DEFAULT_MODEL;
        return { available: models.length > 0, model: bestModel };
    } catch {
        return { available: false, model: DEFAULT_MODEL };
    }
}

import * as http from 'http';

/**
 * Core generate function — sends a prompt to Ollama and returns response text.
 * Uses native Node http to completely bypass Next.js unconfigurable 5-minute Undici fetch timeout.
 */
export async function ollamaGenerate(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(`${OLLAMA_BASE_URL}/api/generate`);

            const req = http.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeout: 0 // Disable socket timeout completely
            }, (res: http.IncomingMessage) => {
                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                    let errData = '';
                    res.on('data', chunk => { errData += chunk.toString(); });
                    res.on('end', () => reject(new Error(`Ollama error (${res.statusCode}): ${errData}`)));
                    return;
                }

                let fullResponse = '';
                let buffer = '';

                res.on('data', (chunk) => {
                    buffer += chunk.toString('utf-8');
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.response) {
                                fullResponse += parsed.response;
                            }
                        } catch (e) {
                            // Ignore partial chunks
                        }
                    }
                });

                res.on('end', () => {
                    if (buffer.trim()) {
                        try {
                            const parsed = JSON.parse(buffer);
                            if (parsed.response) fullResponse += parsed.response;
                        } catch (e) { }
                    }
                    resolve(fullResponse.trim());
                });

                res.on('error', (err) => reject(new Error('Streaming error from Ollama: ' + err.message)));
            });

            req.on('error', (err) => reject(new Error('Network error connecting to Ollama: ' + err.message)));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Ollama connection timed out.'));
            });

            req.write(JSON.stringify({
                model,
                prompt,
                stream: true,
                options: {
                    temperature: 0.4,
                    top_p: 0.9,
                    num_predict: 1000, // Explicitly allow larger generation
                },
            }));

            req.end();

        } catch (err: any) {
            reject(new Error('Failed to initialize Ollama request: ' + err.message));
        }
    });
}

/**
 * Summarize research text using Qwen — returns concise executive summary.
 */
export async function summarizeWithOllama(text: string): Promise<string> {
    const truncated = text.substring(0, 4500); // Reduce context window to improve CPU latency
    const prompt = `System Role Configuration:
You are an elite, world-class Product Manager and Lead Analyst. Your analytical capabilities are legendary, and you excel at taking complex, unstructured documents (whether they are user research transcripts, functional specs, market analysis, or technical documentation) and distilling them into highly readable, universally valuable intelligence reports.

Core Directive:
Explain and summarize the provided document. Extract the undeniable signal from the noise. Your output must be a masterfully structured Markdown report so profound, clear, and immediately actionable that any team member can read it and instantly understand the document's core value.

Required Output Architecture (Strictly adhere to this Markdown format):

## 📄 1. Executive Summary
*(Write 3-4 masterful sentences explaining exactly what this document is, its primary focus, and why it matters. Frame the core narrative.)*

## 💡 2. Key Themes & Main Ideas
*(Identify the top 3-4 most critical themes, findings, or concepts from the text. Explain them clearly.)*
- **[Theme Name]**: [Deep description of the concept or finding based purely on the text.]
- **[Theme Name]**: [Deep description...]

## 📊 3. Crucial Details & Evidence
*(Extract the most powerful data points, specific examples, or compelling quotes that support the overall document.)*
- *[Detail/Quote/Data point 1]*
- *[Detail/Quote/Data point 2]*

## 🚀 4. Strategic Implications & Actionable Takeaways
*(Translate the document's contents into undeniable action items, consequences, or strategic bets.)*
- 🛠 **Tactical Takeaway**: [A clear, immediate next step, fix, or realization based on the text.]
- 🗺️ **Strategic Implication**: [How this document should shape our broader roadmap or product vision.]

Absolute Constraints:
- Output ONLY the requested Markdown document. NO introductory greetings, NO conversational filler concluding the message.
- You must write beautifully, concisely, and with extreme authority.
- ALL insights must be irrefutably grounded in the provided text. Zero hallucinations.

Raw Document Input:
"""
${truncated}
"""

Generate Universal Intelligence Report:`;
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
