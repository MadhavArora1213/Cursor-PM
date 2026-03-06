export interface RoadmapItem {
    id: string;
    workspaceId: string;
    title: string;
    description: string;
    status: 'planned' | 'in-progress' | 'completed' | 'backlog';
    quarter?: string; // e.g., 'Q3 2024'
    linkedFeatureId?: string;
    isPublic: boolean;
    priority: 'low' | 'medium' | 'high';
    updatedAt: string;
}

export interface ChangelogEntry {
    id: string;
    workspaceId: string;
    version: string;
    releaseDate: string;
    title: string;
    content: string; // Markdown supported
    categories: ('feature' | 'improvement' | 'fix' | 'breaking')[];
    isPublished: boolean;
    updatedAt: string;
}
