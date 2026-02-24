export interface ResearchQuote {
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral';
}

export interface ResearchAIMeta {
    summarySource?: 'ollama' | 'extractive';
    transcriptionSource?: 'whisper' | 'pdf' | 'text' | 'placeholder';
    ollamaModel?: string | null;
    chromaIndexed?: boolean;
}

export interface ResearchItem {
    id: string;
    workspaceId: string;
    uploaderId: string;
    title: string;
    description: string;
    type: 'audio' | 'document' | 'text';
    status: 'pending' | 'processing' | 'analyzed' | 'failed';
    summary?: string;
    sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
    sentimentScore?: number;
    sentimentDetail?: { positive: number; negative: number; neutral: number };
    themes?: string[];
    quotes?: ResearchQuote[];
    wordCount?: number;
    fileUrl?: string;
    fileName?: string;
    content?: string;
    // Module 5 AI Service tracking
    vectorized?: boolean;
    aiMeta?: ResearchAIMeta;
    createdAt: Date;
    updatedAt: Date;
}
