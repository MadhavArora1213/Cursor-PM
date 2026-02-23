export interface ResearchQuote {
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral';
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
    createdAt: Date;
    updatedAt: Date;
}

