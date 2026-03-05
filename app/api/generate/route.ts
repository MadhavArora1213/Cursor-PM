import { NextResponse } from 'next/server';
import {
    checkOllamaHealth,
    generateFullStrategyWithOllama,
    FullStrategy
} from '@/lib/ollama';

// =====================================================
// POST /api/generate
// MODULE 6: STRATEGY PLANNER — LLM Strategy Generation
// Uses Ollama/Qwen to generate a complete strategy from research data
// Body: {
//   themes: string[],         // all themes from analyzed research
//   researchSummaries: string[],
//   analyzedCount: number,
//   workspaceId: string
// }
// =====================================================
export async function POST(req: Request) {
    try {
        const { themes, topTheme, researchSummaries, analyzedCount, workspaceId } = await req.json();

        // Support both old (topTheme) and new (themes[]) API format
        const allThemes: string[] = themes || (topTheme ? [topTheme] : []);

        if (allThemes.length === 0 || !researchSummaries || !analyzedCount) {
            return NextResponse.json(
                { error: 'themes, researchSummaries, and analyzedCount are required' },
                { status: 400 }
            );
        }

        // Check if Ollama is available
        const ollamaStatus = await checkOllamaHealth();
        console.log(`[GENERATE] Ollama: ${ollamaStatus.available ? `✅ ${ollamaStatus.model}` : '❌ offline (using templates)'}`);
        console.log(`[GENERATE] Themes: ${allThemes.join(', ')}`);
        console.log(`[GENERATE] Research summaries: ${researchSummaries.length} items (${researchSummaries.reduce((a: number, s: string) => a + s.length, 0)} chars total)`);

        let strategy: FullStrategy;
        let generationSource: 'ollama' | 'template' = 'template';

        if (ollamaStatus.available) {
            try {
                strategy = await generateFullStrategyWithOllama(allThemes, researchSummaries, analyzedCount);
                generationSource = 'ollama';
            } catch (ollamaErr) {
                console.warn('[GENERATE] Ollama failed, falling back to templates:', ollamaErr);
                strategy = getTemplateStrategy(allThemes, analyzedCount);
            }
        } else {
            strategy = getTemplateStrategy(allThemes, analyzedCount);
        }

        return NextResponse.json({
            success: true,
            source: generationSource,
            ollamaModel: ollamaStatus.available ? ollamaStatus.model : null,
            strategy
        });

    } catch (error: any) {
        console.error('[GENERATE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Strategy generation failed' }, { status: 500 });
    }
}

// ─── Template Fallback (used when Ollama is offline) ─────────────────────────

function getTemplateStrategy(themes: string[], analyzedCount: number): FullStrategy {
    const primaryTheme = themes[0] || 'Product Experience';
    const themeList = themes.join(', ');

    return {
        hypothesis: {
            title: `Improve ${primaryTheme}`,
            solution: `redesign and optimize the ${primaryTheme.toLowerCase()} based on research findings across ${analyzedCount} documents`,
            benefit: `user satisfaction and task completion rate will increase by 30%`,
            need: `${themeList} emerged as key themes across ${analyzedCount} research documents, indicating a critical area for improvement`,
        },
        userStories: [
            { text: `As a user, I want improved ${primaryTheme.toLowerCase()} so that I can accomplish my goals more efficiently.`, rice: { r: 1000, i: 2, c: 0.8, e: 1 } },
            { text: `As a product manager, I want clear metrics on ${primaryTheme.toLowerCase()} performance so I can identify and resolve bottlenecks.`, rice: { r: 100, i: 3, c: 0.9, e: 2 } },
            { text: `As a team member, I want streamlined ${primaryTheme.toLowerCase()} workflows so that our collaboration is friction-free.`, rice: { r: 50, i: 2, c: 0.7, e: 1 } },
        ],
        okrs: [{
            objective: `Transform the ${primaryTheme.toLowerCase()} to best-in-class based on research insights`,
            keyResults: [
                `Reduce user-reported issues related to ${primaryTheme.toLowerCase()} by 50% by Q2`,
                `Increase NPS score from baseline by +15 points within 60 days of launch`,
            ],
        }],
        risks: [
            `High technical debt in ${primaryTheme.toLowerCase()} module`,
            `Potential disruption to existing user workflows`
        ],
        experiments: [
            { title: 'Alpha Test Redesign', hypothesis: 'Redesign reduces friction', metric: 'Task Completion Time' }
        ]
    };
}
