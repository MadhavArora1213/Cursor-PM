/**
 * LocalDBService - Client-side wrapper for LocalDB API
 * Replaces Firestore calls with fetch calls to /api/localdb
 */

export class LocalDBService {
    static async getAll(collection: string, filters: Record<string, string> = {}): Promise<any[]> {
        const query = new URLSearchParams({ collection, ...filters }).toString();
        const res = await fetch(`/api/localdb?${query}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    static async getById(collection: string, id: string): Promise<any | null> {
        const query = new URLSearchParams({ collection, id }).toString();
        const res = await fetch(`/api/localdb?${query}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    static async add(collection: string, data: any): Promise<string> {
        const res = await fetch('/api/localdb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection, action: 'add', data })
        });
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        return result.id;
    }

    static async update(collection: string, id: string, data: any): Promise<void> {
        const res = await fetch('/api/localdb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection, action: 'update', id, data })
        });
        if (!res.ok) throw new Error(await res.text());
    }

    static async delete(collection: string, id: string): Promise<void> {
        const res = await fetch('/api/localdb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection, action: 'delete', id })
        });
        if (!res.ok) throw new Error(await res.text());
    }
}
