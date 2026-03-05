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
                    num_predict: 1024, // Full strategy needs more tokens
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
 * Generate a complete product strategy (hypothesis + user stories + OKRs) in ONE call.
 * This ensures all parts of the strategy are grounded in the actual research data.
 */
export interface FullStrategy {
    hypothesis: { title: string; solution: string; benefit: string; need: string };
    userStories: { text: string; rice: { r: number; i: number; c: number; e: number } }[];
    okrs: { objective: string; keyResults: string[] }[];
    risks: string[];
    experiments: { title: string; hypothesis: string; metric: string }[];
}

/**
 * Generate a complete product strategy (hypothesis + user stories + OKRs + Risks + Experiments) in ONE call.
 * This ensures all parts of the strategy are grounded in the actual research data.
 */
export async function generateFullStrategyWithOllama(
    themes: string[],
    researchSummaries: string[],
    analyzedCount: number
): Promise<FullStrategy> {
    // Truncate each summary to keep total context manageable for 3B/7B model
    const truncatedSummaries = researchSummaries.slice(0, 3).map(s => s.substring(0, 800));
    const context = truncatedSummaries.join('\n---\n');
    const themeList = themes.slice(0, 5).join(', ');

    const prompt = `You are a Senior Product Manager. Analyze the user research and create a high-level product discovery strategy.

THEMES DETECTED: ${themeList}

RESEARCH CONTEXT:
${context}

Based on the research, generate a strategy in JSON format:
{
  "hypothesis": {
    "title": "short ambitious title",
    "solution": "the primary feature/change to implement",
    "benefit": "the primary outcome for the user",
    "need": "the specific problem found in research this solves"
  },
  "userStories": [
    {
      "text": "As a [type], I want [action], so [value]",
      "rice": { "r": 500, "i": 2, "c": 0.8, "e": 2 } 
    }
  ],
  "okrs": [
    {
      "objective": "High level objective",
      "keyResults": ["measurable metric 1", "measurable metric 2"]
    }
  ],
  "risks": ["Risk 1 description", "Risk 2 description"],
  "experiments": [
    { "title": "Experiment Name", "hypothesis": "If we X then Y", "metric": "Conversion/Retention/etc" }
  ]
}

RULES: 
1. The Solution must directly solve a pain point in the research.
2. RICE scores: Reach(count), Impact(1-3), Confidence(0-1), Effort(1-5).
3. Output ONLY valid JSON.`;

    console.log(`[STRATEGY] Requesting discovery strategy for: ${themeList}`);
    const raw = await ollamaGenerate(prompt);

    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            return {
                hypothesis: {
                    title: parsed.hypothesis?.title || `Strategy for ${themeList}`,
                    solution: parsed.hypothesis?.solution || 'No solution generated',
                    benefit: parsed.hypothesis?.benefit || 'No benefit generated',
                    need: parsed.hypothesis?.need || 'No need generated',
                },
                userStories: Array.isArray(parsed.userStories)
                    ? parsed.userStories.map((s: any) => ({
                        text: typeof s === 'string' ? s : (s.text || s.story || JSON.stringify(s)),
                        rice: s.rice || { r: 100, i: 1, c: 0.5, e: 1 }
                    }))
                    : [],
                okrs: Array.isArray(parsed.okrs)
                    ? parsed.okrs.map((okr: any) => ({
                        objective: String(okr.objective || ''),
                        keyResults: Array.isArray(okr.keyResults) ? okr.keyResults.map(String) : [],
                    }))
                    : [],
                risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
                experiments: Array.isArray(parsed.experiments)
                    ? parsed.experiments.map((ex: any) => ({
                        title: String(ex.title || 'Experiment'),
                        hypothesis: String(ex.hypothesis || ''),
                        metric: String(ex.metric || 'Success Rate')
                    }))
                    : []
            };
        }
    } catch (e) {
        console.warn('[STRATEGY] JSON Parse Failed. Falling back.', e);
    }

    // Comprehensive Fallback
    return {
        hypothesis: {
            title: `Optimize ${themes[0] || 'Experience'}`,
            solution: `Redesign the core ${themes[0] || 'product'} flow`,
            benefit: `Drastic reduction in user friction`,
            need: `Respond to ${themeList} identified in ${analyzedCount} research docs`
        },
        userStories: [
            { text: `As a user, I want a faster ${themes[0]} so I can save time.`, rice: { r: 1000, i: 2, c: 0.8, e: 1 } }
        ],
        okrs: [{ objective: `Master ${themes[0] || 'Experience'}`, keyResults: [`Increase NPS by 10`] }],
        risks: [`High implementation complexity`, `User resistance to change`],
        experiments: [{ title: `Alpha Test`, hypothesis: `Low friction flow increases conversion`, metric: `Conversion Rate` }]
    };
}
