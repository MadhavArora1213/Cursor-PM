export interface Metric {
    id: string;
    name: string;
    description: string;
    type: 'quantitative' | 'qualitative';
    targetValue?: number;
}

export interface MetricResult {
    id: string;
    name: string;
    value: number;
    confidenceInterval: [number, number];
}

export interface ExperimentResult {
    metrics: MetricResult[];
    statisticalSignificance: number;
    confidenceInterval: [number, number];
    conclusion: string;
    metadata: {
        analyzedAt: Date;
        analystId: string;
    };
}

export interface Experiment {
    id: string;
    workspaceId: string;
    title: string;
    description: string;
    hypothesis: string;
    design: string;
    metrics: Metric[];
    results?: ExperimentResult;
    status: 'planned' | 'in-progress' | 'completed' | 'paused';
    metadata: {
        authorId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate?: Date;
        endDate?: Date;
        participants?: number;
        tags?: string[];
    };
}
