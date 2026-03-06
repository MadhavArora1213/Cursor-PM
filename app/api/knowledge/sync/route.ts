import { NextResponse } from 'next/server';
import { syncWorkspaceKnowledge } from '@/lib/knowledgeIndexingService';
import { checkChromaHealth } from '@/lib/vectorService';

export async function POST(req: Request) {
    try {
        const { workspaceId } = await req.json();

        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
        }

        const chromaOk = await checkChromaHealth();
        if (!chromaOk) {
            return NextResponse.json({ error: 'ChromaDB is not available. Knowledge sync requires a running vector database.' }, { status: 503 });
        }

        const result = await syncWorkspaceKnowledge(workspaceId);

        return NextResponse.json({
            success: true,
            message: 'Workspace knowledge indexed successfully.',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[KNOWLEDGE SYNC ERROR]', error);
        return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
    }
}
