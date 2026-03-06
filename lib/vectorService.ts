// =====================================================
// MODULE 5: CHROMADB VECTOR SERVICE
// Local vector database for semantic search.
// Requires: chroma running at http://localhost:8000
// Install:  pip install chromadb && chroma run --path ./chroma
// =====================================================

import { ChromaClient, Collection } from 'chromadb';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'workspace_knowledge';

let client: ChromaClient | null = null;
let collection: Collection | null = null;

/**
 * Check if ChromaDB is running.
 * Tries v2 API first (ChromaDB >= 1.0), then falls back to v1.
 */
export async function checkChromaHealth(): Promise<boolean> {
    try {
        // Try v2 first (ChromaDB >= 1.0 / 1.5+)
        const res = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, {
            signal: AbortSignal.timeout(3000),
        });
        if (res.ok || res.status === 410 || res.status === 404) return true;
    } catch { /* v2 not available */ }

    try {
        // Fallback to v1 (older ChromaDB versions)
        const res = await fetch(`${CHROMA_URL}/api/v1/heartbeat`, {
            signal: AbortSignal.timeout(3000),
        });
        return res.ok || res.status === 410 || res.status === 404;
    } catch {
        return false;
    }
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5';

/**
 * Custom embedding function using our local Ollama instance.
 * Completely bypasses @chroma-core/default-embed which crashes Turbopack next build.
 */
const ollamaEmbeddingFunction = {
    generate: async (texts: string[]): Promise<number[][]> => {
        const embeddings: number[][] = [];
        for (const text of texts) {
            try {
                const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: DEFAULT_MODEL, prompt: text })
                });

                if (!res.ok) {
                    console.warn(`[EMBEDDING ERROR] Failed to generate embedding with Ollama status: ${res.status}`);
                    // Fallback to a zero-vector so indexing doesn't completely crash the whole process
                    embeddings.push(Array(2048).fill(0.01));
                    continue;
                }
                const data = await res.json();
                embeddings.push(data.embedding);
            } catch (err) {
                console.warn(`[EMBEDDING ERROR] Network error hitting Ollama:`, err);
                embeddings.push(Array(2048).fill(0.01)); // Fallback dimensionality
            }
        }
        return embeddings;
    }
};

/**
 * Initialize ChromaDB client and get/create the research collection.
 * This is safe to call multiple times (idempotent).
 */
async function getCollection(): Promise<Collection> {
    if (collection) return collection;

    if (!client) {
        // Parse CHROMA_URL to avoid deprecated 'path' parameter warning
        const urlParams = new URL(CHROMA_URL);
        client = new ChromaClient({
            host: urlParams.hostname,
            port: parseInt(urlParams.port) || 8000,
            ssl: urlParams.protocol === 'https:'
        });
    }

    try {
        // ChromaDB statically logs an unsuppressable warning if you bypass their default heavy 
        // transformers-based embedding system. We temporarily silence console.warn since we 
        // explicitly compute and pass raw float arrays down below anyway.
        const originalWarn = console.warn;
        console.warn = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('No embedding function configuration found')) return;
            originalWarn(...args);
        };

        collection = await client.getOrCreateCollection({
            name: COLLECTION_NAME,
            embeddingFunction: ollamaEmbeddingFunction,
            metadata: {
                description: 'Product research documents for semantic search',
                'hnsw:space': 'cosine',
            },
        });

        console.warn = originalWarn; // Restore warnings immediately
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

    const documentText = text.substring(0, 8000);
    const embeddings = await ollamaEmbeddingFunction.generate([documentText]);

    // ChromaDB upsert: add if not exists, update if exists
    await col.upsert({
        ids: [id],
        documents: [documentText], // Cap at 8k chars
        embeddings: embeddings,
        metadatas: [{ ...metadata, id, indexedAt: new Date().toISOString() }],
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
    nResults: number = 5,
    idList?: string[]
): Promise<SemanticSearchResult[]> {
    const col = await getCollection();

    let whereClause: any = undefined;

    if (workspaceId && idList && idList.length > 0) {
        // Correct ChromaDB $in syntax for metadata filtering
        whereClause = {
            $and: [
                { workspaceId: { $eq: workspaceId } },
                { id: { $in: idList } }
            ]
        };
    } else if (workspaceId) {
        whereClause = { workspaceId: { $eq: workspaceId } };
    } else if (idList && idList.length > 0) {
        whereClause = { id: { $in: idList } };
    }

    const queryEmbeddings = await ollamaEmbeddingFunction.generate([query]);

    const results = await col.query({
        queryEmbeddings: queryEmbeddings,
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
