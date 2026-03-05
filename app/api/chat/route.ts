import { NextResponse } from 'next/server';
import { semanticSearch, checkChromaHealth } from '@/lib/vectorService';
import { checkOllamaHealth, ollamaGenerate } from '@/lib/ollama';
import { getResearchItemsByIds } from '@/lib/firebase/researchService';

// =====================================================
// POST /api/chat — RAG-Powered AI Research Chat
// ─────────────────────────────────────────────────────
// Flow: User question → Vector search → Retrieve research → LLM reasoning → Answer
// =====================================================

export async function POST(req: Request) {
    try {
        const { query, workspaceId, chatHistory = [], selectedDocIds = [] } = await req.json();

        if (!query || query.trim().length < 2) {
            return NextResponse.json(
                { error: 'Query must be at least 2 characters' },
                { status: 400 }
            );
        }

        // Check service availability
        const [ollamaStatus, chromaAvailable] = await Promise.all([
            checkOllamaHealth(),
            checkChromaHealth(),
        ]);

        if (!ollamaStatus.available) {
            return NextResponse.json({
                success: false,
                error: 'Ollama is not running. Start Ollama to use AI chat.',
                answer: 'I need the Ollama LLM service to answer your questions. Please start Ollama with `ollama serve` and ensure a model like qwen2.5:3b is available.',
                sources: [],
            });
        }

        // Step 1: Vector search for relevant research context
        let contextChunks: string[] = [];
        let sources: { id: string; title: string; distance: number }[] = [];

        if (chromaAvailable) {
            try {
                // If specific IDs are provided, only search within those.
                const searchResults = await semanticSearch(query, workspaceId, 5, selectedDocIds);
                contextChunks = searchResults
                    .filter(r => r.text && r.text.length > 20)
                    .map(r => r.text.substring(0, 1500));
                sources = searchResults.map(r => ({
                    id: r.id,
                    title: (r.metadata?.title as string) || 'Research Document',
                    distance: r.distance,
                }));
            } catch (err) {
                console.warn('[CHAT] ChromaDB search failed, proceeding without context:', err);
            }
        }

        // ── FALLBACK: Use Firestore content if the vector store has NO results for specific selected documents ──
        if (contextChunks.length === 0 && selectedDocIds.length > 0) {
            const items = await getResearchItemsByIds(selectedDocIds);
            contextChunks = items
                .filter(i => i.content && i.content.length > 10)
                .map(i => i.content!.substring(0, 3000)); // Use a larger chunk for direct content
            sources = items.map(i => ({ id: i.id, title: i.title, distance: 0 }));
            console.log(`[CHAT] Fallback to Firestore content for ${items.length} docs`);
        }

        // Step 2: Build RAG prompt
        let contextBlock = '';
        if (contextChunks.length > 0) {
            contextBlock = contextChunks.map((c, i) => `--- Research Document ${i + 1} ---\n${c}`).join('\n\n');
        } else if (selectedDocIds.length > 0) {
            contextBlock = "The user has selected specific documents, but their content is currently unavailable or empty. Please inform the user that their research is still being processed or may be missing readable text.";
        } else {
            contextBlock = 'No relevant researchers found globally. Respond based on general product knowledge, but mention the lack of specific document hits.';
        }

        // Include recent chat history for conversational context
        const historyBlock = chatHistory.length > 0
            ? chatHistory
                .slice(-4) // Last 4 messages
                .map((msg: { role: string; content: string }) =>
                    `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content.substring(0, 300)}`
                )
                .join('\n')
            : '';

        const prompt = `You are an expert AI Product Analyst embedded in a product management tool. Your job is to analyze research data and provide actionable product insights.

${historyBlock ? `Previous conversation:\n${historyBlock}\n` : ''}

The user has uploaded research documents. Here is the relevant context retrieved from those documents:

${contextBlock}

Now answer the user's question based SPECIFICALLY on the research data above. Be specific, cite findings from the documents, and provide actionable recommendations.

User Question: ${query}

Instructions:
- Answer in clear, structured markdown with VERY GOOD SPACING.
- Use multiple paragraphs separated by empty lines (CRITICAL for readability).
- Use bold headers (e.g., ### Section Name) to separate different parts of your analysis.
- Reference specific findings from the research documents.
- If the research doesn't contain relevant information, say so honestly.
- Provide actionable product management insights.
- Use bullet points (standard markdown - or *) for lists.
- Keep your answer focused and concise (300 words max).
- Ensure there is an empty line between headers, paragraphs, and list items.`;

        // Step 3: LLM reasoning
        const answer = await ollamaGenerate(prompt, ollamaStatus.model);

        return NextResponse.json({
            success: true,
            answer,
            sources,
            model: ollamaStatus.model,
            contextUsed: contextChunks.length,
        });

    } catch (error: any) {
        console.error('[CHAT ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Chat failed', answer: 'Sorry, an error occurred while processing your question.' },
            { status: 500 }
        );
    }
}
