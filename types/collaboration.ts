export interface Comment {
    id: string;
    workspaceId: string;
    itemId: string; // ID of the research item, strategy feature, or experiment
    itemType: 'research' | 'feature' | 'experiment';
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    parentId?: string;
}

export interface WorkshopSession {
    id: string;
    workspaceId: string;
    title: string;
    description?: string;
    creatorId: string;
    participants: string[];
    status: 'planned' | 'active' | 'completed';
    whiteboardData?: any;
    startTime: string;
    endTime?: string;
    createdAt: string;
}

export interface AppNotification {
    id: string;
    userId: string;
    type: 'mention' | 'invite' | 'update';
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
}
