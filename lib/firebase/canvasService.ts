import { DBAdapter } from '../db-adapter';

export interface CanvasCard {
    id: string;
    type: 'research' | 'insight' | 'feature' | 'roadmap' | 'note' | 'ai-output';
    title: string;
    content: string;
    color: string;
    x: number;
    y: number;
    width: number;
    meta?: Record<string, string>;
}

export interface CanvasBoard {
    id: string;
    workspaceId: string;
    cards: CanvasCard[];
    updatedAt: any;
}

const COLLECTION = 'canvas_boards';

export const saveCanvasBoard = async (workspaceId: string, cards: CanvasCard[]) => {
    // Check if board already exists to update or create
    const boards = await DBAdapter.getAll(COLLECTION, { workspaceId });
    if (boards.length > 0) {
        await DBAdapter.update(COLLECTION, boards[0].id, {
            cards,
            updatedAt: new Date().toISOString()
        });
    } else {
        await DBAdapter.add(COLLECTION, {
            workspaceId,
            cards,
            updatedAt: new Date().toISOString()
        });
    }
};

export const getCanvasBoard = async (workspaceId: string): Promise<CanvasCard[] | null> => {
    const boards = await DBAdapter.getAll(COLLECTION, { workspaceId });
    if (boards.length > 0) {
        return boards[0].cards as CanvasCard[];
    }
    return null;
};
