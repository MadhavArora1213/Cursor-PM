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
    fileUrl?: string;
    fileName?: string;
    content?: string; // Transcribed text or document content
    createdAt: Date;
    updatedAt: Date;
}
