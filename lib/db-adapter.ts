import { LocalDBService } from './localDBService';

const isServer = typeof window === 'undefined';

export class DBAdapter {
    static async getAll(collection: string, filters: Record<string, string> = {}): Promise<any[]> {
        if (isServer) {
            const { LocalDB } = await import('./localDB');
            let items = await LocalDB.getAll(collection);

            // Apply common filters used in the app
            if (filters.workspaceId) {
                items = items.filter(item => item.workspaceId === filters.workspaceId);
            }
            if (filters.userId && collection === 'workspaces') {
                items = items.filter(item => item.members?.some((m: any) => m.userId === filters.userId));
            }

            return items;
        } else {
            return LocalDBService.getAll(collection, filters);
        }
    }

    static async getById(collection: string, id: string): Promise<any | null> {
        if (isServer) {
            const { LocalDB } = await import('./localDB');
            return await LocalDB.getById(collection, id);
        } else {
            return LocalDBService.getById(collection, id);
        }
    }

    static async add(collection: string, data: any): Promise<string> {
        if (isServer) {
            const { LocalDB } = await import('./localDB');
            return await LocalDB.add(collection, data);
        } else {
            return LocalDBService.add(collection, data);
        }
    }

    static async update(collection: string, id: string, data: any): Promise<void> {
        if (isServer) {
            const { LocalDB } = await import('./localDB');
            return await LocalDB.update(collection, id, data);
        } else {
            return LocalDBService.update(collection, id, data);
        }
    }

    static async delete(collection: string, id: string): Promise<void> {
        if (isServer) {
            const { LocalDB } = await import('./localDB');
            return await LocalDB.delete(collection, id);
        } else {
            return LocalDBService.delete(collection, id);
        }
    }
}
