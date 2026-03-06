import { DBAdapter } from '../lib/db-adapter';
import { TechnicalSpec } from '@/types/engineering';

const COLLECTION = 'technical_specs';

export const createTechnicalSpec = async (specData: Partial<TechnicalSpec>) => {
    const now = new Date().toISOString();
    const newSpec = {
        ...specData,
        metadata: {
            ...specData.metadata,
            createdAt: now,
            updatedAt: now,
        },
    };
    return await DBAdapter.add(COLLECTION, newSpec);
};

export const getTechnicalSpec = async (specId: string): Promise<TechnicalSpec | null> => {
    return await DBAdapter.getById(COLLECTION, specId);
};

export const updateTechnicalSpec = async (specId: string, updates: Partial<TechnicalSpec>) => {
    const data = {
        ...updates,
        'metadata.updatedAt': new Date().toISOString(),
    };
    await DBAdapter.update(COLLECTION, specId, data);
};

export const deleteTechnicalSpec = async (specId: string) => {
    await DBAdapter.delete(COLLECTION, specId);
};

export const getTechnicalSpecsByWorkspace = async (workspaceId: string): Promise<TechnicalSpec[]> => {
    return await DBAdapter.getAll(COLLECTION, { workspaceId });
};

export const getTechnicalSpecsByFeature = async (featureId: string): Promise<TechnicalSpec[]> => {
    const all = await DBAdapter.getAll(COLLECTION);
    return all.filter(spec => spec.featureId === featureId);
};
