export interface UserFeedback {
    id: string;
    workspaceId: string;
    source: 'intercom' | 'zendesk' | 'discord' | 'custom_form';
    rawContent: string;
    userEmail?: string;
    aiSummary?: string;
    aiTags?: string[];
    sentimentScore?: number; // -1 to 1
    status: 'new' | 'triaged' | 'linked' | 'archived';
    linkedFeatureId?: string;
    createdAt: string;
    processedAt?: string;
}
