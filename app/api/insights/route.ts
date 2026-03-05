import { NextResponse } from 'next/server';
import { checkOllamaHealth, ollamaGenerate } from '@/lib/ollama';
import { getResearchByWorkspace } from '@/lib/firebase/researchService';

// =====================================================
// POST /api/insights — AI-Powered Insight Generation
// ─────────────────────────────────────────────────────
// Generates: Pain Point Ranking, Feature Opportunities,
// Customer Personas, Competitor Gaps from research data
// =====================================================

export async function POST(req: Request) {
    try {
        const { workspaceId, type = 'full' } = await req.json();

        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
        }

        // Fetch all analyzed research
        const items = await getResearchByWorkspace(workspaceId);
        const analyzed = items.filter(i => i.status === 'analyzed');

        if (analyzed.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No analyzed research found. Upload and analyze documents first.',
            });
        }

        // Build research context
        const researchContext = analyzed
            .map((item, i) => {
                const themes = item.themes?.join(', ') || 'none';
                const sentiment = item.sentiment || 'unknown';
                const summary = (item.summary || item.content || '').substring(0, 800);
                return `Document ${i + 1}: "${item.title}"
Sentiment: ${sentiment}
Themes: ${themes}
Summary: ${summary}`;
            })
            .join('\n\n---\n\n');

        const ollamaStatus = await checkOllamaHealth();
        if (!ollamaStatus.available) {
            // Return computed insights from metadata only
            return NextResponse.json({
                success: true,
                source: 'computed',
                insights: computeBasicInsights(analyzed),
            });
        }

        // Generate comprehensive insights via LLM
        const prompt = `You are an expert AI Product Analyst. Analyze ALL the following research documents and generate a comprehensive product intelligence report.

Research Data (${analyzed.length} documents):
${researchContext}

Generate a JSON response with this EXACT structure:
{
  "painPoints": [
    { "title": "string", "severity": "high|medium|low", "mentions": number, "description": "string" }
  ],
  "featureOpportunities": [
    { "title": "string", "confidence": number, "description": "string", "suggestedSolution": "string" }
  ],
  "customerPersonas": [
    { "segment": "string", "need": "string", "pain": "string", "opportunity": "string" }
  ],
  "sentimentBreakdown": {
    "positive": number,
    "neutral": number,
    "negative": number,
    "mixed": number
  },
  "topThemes": [
    { "theme": "string", "count": number, "trend": "rising|stable|declining" }
  ],
  "riskFactors": [
    { "risk": "string", "impact": "high|medium|low", "recommendation": "string" }
  ]
}

Rules:
- Base ALL insights on the actual research data above
- Pain points should be ranked by severity and frequency
- Feature opportunities should include confidence percentages (0-100)
- Be specific, not generic
- Output ONLY valid JSON, no explanation`;

        const raw = await ollamaGenerate(prompt, ollamaStatus.model);

        // Parse JSON from response
        let insights;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                insights = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch {
            // Fallback to computed insights
            insights = computeBasicInsights(analyzed);
        }

        return NextResponse.json({
            success: true,
            source: 'ollama',
            model: ollamaStatus.model,
            analyzedCount: analyzed.length,
            insights,
        });

    } catch (error: any) {
        console.error('[INSIGHTS ERROR]', error);
        return NextResponse.json({ error: error.message || 'Insight generation failed' }, { status: 500 });
    }
}

// Fallback: compute basic insights from metadata when Ollama is offline
function computeBasicInsights(items: any[]) {
    const themeCount: Record<string, number> = {};
    let positive = 0, negative = 0, neutral = 0, mixed = 0;

    for (const item of items) {
        for (const theme of (item.themes || [])) {
            themeCount[theme] = (themeCount[theme] || 0) + 1;
        }
        if (item.sentiment === 'positive') positive++;
        else if (item.sentiment === 'negative') negative++;
        else if (item.sentiment === 'mixed') mixed++;
        else neutral++;
    }

    const topThemes = Object.entries(themeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([theme, count]) => ({ theme, count, trend: 'stable' as const }));

    return {
        painPoints: topThemes
            .filter(t => t.theme.toLowerCase().includes('complexity') || t.theme.toLowerCase().includes('issue') || t.theme.toLowerCase().includes('problem'))
            .map(t => ({ title: t.theme, severity: t.count >= 3 ? 'high' : t.count >= 2 ? 'medium' : 'low', mentions: t.count, description: `Identified in ${t.count} research documents` })),
        featureOpportunities: topThemes
            .filter(t => t.theme.toLowerCase().includes('request') || t.theme.toLowerCase().includes('feature'))
            .map(t => ({ title: t.theme, confidence: Math.min(95, t.count * 20), description: `Requested across ${t.count} sources`, suggestedSolution: 'Requires further analysis' })),
        customerPersonas: [],
        sentimentBreakdown: { positive, neutral, negative, mixed },
        topThemes,
        riskFactors: [],
    };
}
