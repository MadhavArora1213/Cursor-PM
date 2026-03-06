export interface Test {
    id: string;
    name: string;
    description: string;
    type: 'unit' | 'integration' | 'e2e';
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface TechnicalSpec {
    id: string;
    workspaceId: string;
    featureId: string;
    title: string;
    description: string;
    technicalRequirements: string[];
    architecture: string;
    dependencies: string[];
    effortEstimate: string;
    implementationPlan: string;
    tests: Test[];
    metadata: {
        authorId: string;
        createdAt: string;
        updatedAt: string;
        status: 'draft' | 'review' | 'approved' | 'implemented';
    };
}
