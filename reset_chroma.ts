import { ChromaClient } from 'chromadb';

const CHROMA_URL = 'http://localhost:8000';
const COLLECTION_NAME = 'research_documents';

async function resetChroma() {
    const urlParams = new URL(CHROMA_URL);
    const client = new ChromaClient({
        host: urlParams.hostname,
        port: parseInt(urlParams.port) || 8000
    });

    try {
        console.log(`🗑️ Deleting collection: ${COLLECTION_NAME}...`);
        await client.deleteCollection({ name: COLLECTION_NAME });
        console.log("✅ Collection deleted successfully. It will be re-created with correct dimensions (2048) on next use.");
    } catch (err) {
        console.log("ℹ️ Collection did not exist or could not be deleted:", err.message);
    }
}

resetChroma();
