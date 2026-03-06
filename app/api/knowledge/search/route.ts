import { NextResponse } from 'next/server';
import { semanticSearch } from '@/lib/vectorService';
import { checkOllamaHealth, ollamaGenerate } from '@/lib/ollama';

export async function POST(req: Request) {
    try {
        const { query, workspaceId, nResults = 5 } = await req.json();

        if (!query || !workspaceId) {
            return NextResponse.json({ error: 'query and workspaceId are required' }, { status: 400 });
        }

        // 1. Get semantic search results across all knowledge blocks
        const searchResults = await semanticSearch(query, workspaceId, nResults);

        // 2. If we have results, use them as context for a concise answer
        let answer = "No relevant knowledge found in your workspace to answer this question accurately.";

        if (searchResults.length > 0) {
            const ollama = await checkOllamaHealth();
            if (ollama.available) {
                const contextText = searchResults.map(r => `[${r.metadata.type}] ${r.metadata.title}: ${r.text}`).join('\n\n');

                const prompt = `You are a Knowledge Expert assistant. Based on the following workspace knowledge context, answer the user's question accurately and concisely. Mention the specific research, feature, or OKR you are referring to.
                
Context:
${contextText}

Question: ${query}

Answer strictly using the context above. If you don't know, say you don't know.`;

                answer = await ollamaGenerate(prompt, ollama.model);
            } else {
                answer = "Semantic results found, but AI reasoning is offline (Ollama not detected). Displaying matching items below.";
            }
        }

        return NextResponse.json({
            success: true,
            answer,
            results: searchResults
        });

    } catch (error: any) {
        console.error('[KNOWLEDGE SEARCH ERROR]', error);
        return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
    }
}
