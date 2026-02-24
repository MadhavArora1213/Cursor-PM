import { NextResponse } from 'next/server';
import {
    checkOllamaHealth,
    generateHypothesesWithOllama,
    generateUserStoriesWithOllama,
    generateOKRsWithOllama,
} from '@/lib/ollama';

// =====================================================
// POST /api/generate
// MODULE 6: STRATEGY PLANNER — LLM Strategy Generation
// Uses Ollama/Qwen to generate hypotheses, user stories, OKRs
// Body: {
//   topTheme: string,
//   researchSummaries: string[],
//   analyzedCount: number,
//   workspaceId: string
// }
// =====================================================
export async function POST(req: Request) {
    try {
        const { topTheme, researchSummaries, analyzedCount, workspaceId } = await req.json();

        if (!topTheme || !researchSummaries || !analyzedCount) {
            return NextResponse.json(
                { error: 'topTheme, researchSummaries, and analyzedCount are required' },
                { status: 400 }
            );
        }

        // Check if Ollama is available
        const ollamaStatus = await checkOllamaHealth();
        console.log(`[GENERATE] Ollama: ${ollamaStatus.available ? `✅ ${ollamaStatus.model}` : '❌ offline (using templates)'}`);

        let hypothesis: { solution: string; benefit: string; need: string };
        let userStories: string[];
        let okrs: { objective: string; keyResults: string[] }[];
        let generationSource: 'ollama' | 'template' = 'template';

        if (ollamaStatus.available) {
            try {
                console.log(`[GENERATE] Generating hypothesis with Qwen...`);
                hypothesis = await generateHypothesesWithOllama(topTheme, researchSummaries, analyzedCount);

                console.log(`[GENERATE] Generating user stories...`);
                userStories = await generateUserStoriesWithOllama(hypothesis.solution, topTheme);

                console.log(`[GENERATE] Generating OKRs...`);
                okrs = await generateOKRsWithOllama(
                    `Resolve the top user pain point: ${topTheme}`,
                    topTheme
                );

                generationSource = 'ollama';
                console.log(`[GENERATE] ✅ Strategy generated with Ollama (${ollamaStatus.model})`);
            } catch (ollamaErr) {
                console.warn('[GENERATE] Ollama failed, falling back to templates:', ollamaErr);
                // Fallback values set below
                hypothesis = getTemplateHypothesis(topTheme, analyzedCount);
                userStories = getTemplateUserStories(topTheme);
                okrs = getTemplateOKRs(topTheme);
            }
        } else {
            console.log(`[GENERATE] Ollama offline — using deterministic templates`);
            hypothesis = getTemplateHypothesis(topTheme, analyzedCount);
            userStories = getTemplateUserStories(topTheme);
            okrs = getTemplateOKRs(topTheme);
        }

        return NextResponse.json({
            success: true,
            source: generationSource,
            ollamaModel: ollamaStatus.available ? ollamaStatus.model : null,
            strategy: {
                hypothesis: {
                    title: `Improve ${topTheme}`,
                    ...hypothesis,
                },
                userStories,
                okrs,
            },
        });

    } catch (error: any) {
        console.error('[GENERATE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Strategy generation failed' }, { status: 500 });
    }
}

// ─── Template Fallbacks (used when Ollama is offline) ─────────────────────────

function getTemplateHypothesis(topTheme: string, analyzedCount: number) {
    return {
        solution: `redesign and simplify the ${topTheme.toLowerCase()} experience`,
        benefit: `user satisfaction and task completion rate will increase by 30%`,
        need: `${topTheme} appeared in ${analyzedCount} research items as a top concern`,
    };
}

function getTemplateUserStories(topTheme: string): string[] {
    return [
        `As a new user, I want a clear ${topTheme.toLowerCase()} walkthrough so I can complete my first task without confusion.`,
        `As a product manager, I want to see real-time metrics on ${topTheme.toLowerCase()} so I can identify and resolve bottlenecks.`,
        `As a team member, I want streamlined ${topTheme.toLowerCase()} workflows so I can collaborate efficiently without friction.`,
    ];
}

function getTemplateOKRs(topTheme: string): { objective: string; keyResults: string[] }[] {
    return [{
        objective: `Resolve the top user pain point: ${topTheme}`,
        keyResults: [
            `Reduce user-reported issues related to ${topTheme.toLowerCase()} by 50% by Q2`,
            `Increase NPS score from baseline by +15 points within 60 days of launch`,
            `Achieve 80% task completion rate on redesigned flow (measured in user testing)`,
        ],
    }];
}
