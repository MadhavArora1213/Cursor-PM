import { NextResponse } from 'next/server';
import { semanticSearch, getIndexedCount, checkChromaHealth } from '@/lib/vectorService';

// =====================================================
// POST /api/search
// MODULE 5: CHROMADB Semantic Search
// Body: { query: string, workspaceId?: string, nResults?: number }
// =====================================================
export async function POST(req: Request) {
    try {
        const { query, workspaceId, nResults = 5 } = await req.json();

        if (!query || query.trim().length < 2) {
            return NextResponse.json(
                { error: 'Query must be at least 2 characters' },
                { status: 400 }
            );
        }

        // Check ChromaDB availability
        const isAvailable = await checkChromaHealth();
        if (!isAvailable) {
            return NextResponse.json(
                {
                    error: 'ChromaDB is not running',
                    hint: 'Start ChromaDB: pip install chromadb && chroma run --path ./chroma',
                    results: [],
                },
                { status: 503 }
            );
        }

        const results = await semanticSearch(query, workspaceId, Math.min(nResults, 20));

        return NextResponse.json({
            success: true,
            query,
            results,
            count: results.length,
        });

    } catch (error: any) {
        console.error('[SEARCH ERROR]', error);
        return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
    }
}

// GET /api/search?workspaceId=xxx — returns index stats
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const workspaceId = url.searchParams.get('workspaceId') || undefined;

        const [isAvailable, count] = await Promise.all([
            checkChromaHealth(),
            checkChromaHealth().then(ok => ok ? getIndexedCount(workspaceId) : 0),
        ]);

        return NextResponse.json({
            available: isAvailable,
            indexedDocuments: count,
            workspaceId: workspaceId || 'all',
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
