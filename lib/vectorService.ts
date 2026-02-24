// =====================================================
// MODULE 5: CHROMADB VECTOR SERVICE
// Local vector database for semantic search.
// Requires: chroma running at http://localhost:8000
// Install:  pip install chromadb && chroma run --path ./chroma
// =====================================================

import { ChromaClient, Collection } from 'chromadb';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'research_documents';

let client: ChromaClient | null = null;
let collection: Collection | null = null;

/**
 * Check if ChromaDB is running.
 */
export async function checkChromaHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${CHROMA_URL}/api/v1/heartbeat`, {
            signal: AbortSignal.timeout(3000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Initialize ChromaDB client and get/create the research collection.
 * This is safe to call multiple times (idempotent).
 */
async function getCollection(): Promise<Collection> {
    if (collection) return collection;

    if (!client) {
        client = new ChromaClient({ path: CHROMA_URL });
    }

    try {
        collection = await client.getOrCreateCollection({
            name: COLLECTION_NAME,
            metadata: {
                description: 'Product research documents for semantic search',
                'hnsw:space': 'cosine',
            },
        });
    } catch (err) {
        throw new Error(`ChromaDB connection failed: ${String(err)}`);
    }

    return collection;
}

/**
 * Add or update a research document in the ChromaDB vector store.
 * ChromaDB handles embedding via its default embedding function.
 *
 * @param id        - Firestore document ID of the research item
 * @param text      - Full text content to embed
 * @param metadata  - Optional metadata (workspaceId, title, type, etc.)
 */
export async function upsertResearchDocument(
    id: string,
    text: string,
    metadata: Record<string, string | number | boolean> = {}
): Promise<void> {
    const col = await getCollection();

    // ChromaDB upsert: add if not exists, update if exists
    await col.upsert({
        ids: [id],
        documents: [text.substring(0, 8000)], // Cap at 8k chars
        metadatas: [{ ...metadata, indexedAt: new Date().toISOString() }],
    });
}

/**
 * Delete a research document from the vector store.
 */
export async function deleteResearchDocument(id: string): Promise<void> {
    try {
        const col = await getCollection();
        await col.delete({ ids: [id] });
    } catch {
        // Silently fail if document doesn't exist
    }
}

export interface SemanticSearchResult {
    id: string;
    text: string;
    distance: number;
    metadata: Record<string, string | number | boolean | null>;
}

/**
 * Perform semantic search across all indexed research documents.
 * Returns the top N most relevant documents for the given query.
 *
 * @param query       - Natural language search query
 * @param workspaceId - Filter results to this workspace
 * @param nResults    - Number of results to return (default: 5)
 */
export async function semanticSearch(
    query: string,
    workspaceId?: string,
    nResults: number = 5
): Promise<SemanticSearchResult[]> {
    const col = await getCollection();

    const whereClause = workspaceId
        ? { workspaceId: { $eq: workspaceId } }
        : undefined;

    const results = await col.query({
        queryTexts: [query],
        nResults,
        where: whereClause as any,
        include: ['documents', 'distances', 'metadatas'] as any,
    });

    const ids = results.ids?.[0] || [];
    const documents = results.documents?.[0] || [];
    const distances = results.distances?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];

    return ids.map((id, i) => ({
        id,
        text: documents[i] || '',
        distance: distances[i] || 0,
        metadata: (metadatas[i] as Record<string, string | number | boolean | null>) || {},
    }));
}

/**
 * Get the total count of indexed documents (optionally per workspace).
 */
export async function getIndexedCount(workspaceId?: string): Promise<number> {
    try {
        const col = await getCollection();
        if (workspaceId) {
            const result = await col.get({
                where: { workspaceId: { $eq: workspaceId } } as any,
            });
            return result.ids.length;
        }
        return await col.count();
    } catch {
        return 0;
    }
}

/**
 * Reset the entire collection (for testing/dev purposes only).
 */
export async function resetCollection(): Promise<void> {
    if (!client) {
        client = new ChromaClient({ path: CHROMA_URL });
    }
    try {
        await client.deleteCollection({ name: COLLECTION_NAME });
    } catch {
        // Collection might not exist
    }
    collection = null; // Force re-creation on next call
}
