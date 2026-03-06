import { NextResponse } from 'next/server';
import { checkOllamaHealth, ollamaGenerate } from '@/lib/ollama';

export async function POST(req: Request) {
    try {
        const { hypothesis, title } = await req.json();

        if (!hypothesis) {
            return NextResponse.json({ error: 'Hypothesis is required' }, { status: 400 });
        }

        const ollamaStatus = await checkOllamaHealth();

        if (!ollamaStatus.available) {
            return NextResponse.json({
                success: true,
                source: 'template',
                design: `### Experiment Design: ${title || 'New Experiment'}

1. **Target Audience**: Random 10% of active users.
2. **Success Metric**: 15% increase in task completion rate.
3. **Duration**: 14 days.
4. **Control Group**: Current implementation.
5. **Variant**: Implementation of the proposed solution.

*Note: Connect to Ollama for AI-powered experiment design suggestions.*`
            });
        }

        const prompt = `You are a Senior Product Data Scientist. Design a rigorous experiment to validate this product hypothesis:

Hypothesis: "${hypothesis}"
Feature Title: "${title || 'Unnamed'}"

Provide a detailed experiment design in Markdown, including:
1. Target Audience & Sample Size
2. Experiment Methodology (A/B, Multivariate, etc.)
3. Primary & Secondary Metrics
4. Control vs Variant details
5. Duration & Success Criteria

Be specific, data-driven, and professional. Output only the markdown design.`;

        const design = await ollamaGenerate(prompt, ollamaStatus.model);

        return NextResponse.json({
            success: true,
            source: 'ollama',
            model: ollamaStatus.model,
            design
        });

    } catch (error: any) {
        console.error('[VALIDATION GENERATE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to generate experiment design' }, { status: 500 });
    }
}
