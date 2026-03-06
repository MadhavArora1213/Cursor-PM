import { NextResponse } from 'next/server';
import { checkOllamaHealth, ollamaGenerate } from '@/lib/ollama';

export async function POST(req: Request) {
    try {
        const { featureTitle, featureDescription, userStories } = await req.json();

        if (!featureTitle) {
            return NextResponse.json({ error: 'featureTitle is required' }, { status: 400 });
        }

        const ollama = await checkOllamaHealth();
        if (!ollama.available) {
            return NextResponse.json({ error: 'Ollama is offline. Technical spec generation requires a running local LLM.' }, { status: 503 });
        }

        const prompt = `You are a Senior Technical Product Manager and Software Architect. Create a detailed Technical Specification for the following feature:

Feature Title: ${featureTitle}
Description: ${featureDescription}
User Stories: ${(userStories || []).join('; ')}

Return ONLY a JSON object with this EXACT structure (no markdown, no extra text):
{
  "technicalRequirements": ["req 1", "req 2"],
  "architecture": "description of architecture",
  "dependencies": ["dep 1", "dep 2"],
  "effortEstimate": "e.g. 2 weeks",
  "implementationPlan": "step by step guide",
  "tests": [
    {"name": "test name", "description": "test desc", "type": "unit|integration|e2e"}
  ]
}

Technical Spec JSON:`;

        const response = await ollamaGenerate(prompt, ollama.model);

        // Clean the response in case LLM added markdown backticks
        const jsonContent = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const specData = JSON.parse(jsonContent);

        return NextResponse.json({
            success: true,
            spec: specData
        });

    } catch (error: any) {
        console.error('[TECH SPEC GEN ERROR]', error);
        return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
    }
}
