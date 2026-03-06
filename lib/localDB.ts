import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'uploads', 'db');

// Ensure DB directory exists
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

export class LocalDB {
    private static getFilePath(collection: string) {
        return path.join(DB_PATH, `${collection}.json`);
    }

    private static readData(collection: string): any[] {
        const filePath = this.getFilePath(collection);
        if (!fs.existsSync(filePath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`Error reading collection ${collection}:`, error);
            return [];
        }
    }

    private static writeData(collection: string, data: any[]) {
        const filePath = this.getFilePath(collection);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }

    static async getAll(collection: string): Promise<any[]> {
        return this.readData(collection);
    }

    static async getById(collection: string, id: string): Promise<any | null> {
        const data = this.readData(collection);
        return data.find(item => item.id === id) || null;
    }

    static async add(collection: string, item: any): Promise<string> {
        const data = this.readData(collection);
        const id = item.id || Math.random().toString(36).substring(2, 15);
        const newItem = { ...item, id };
        data.push(newItem);
        this.writeData(collection, data);
        return id;
    }

    static async update(collection: string, id: string, updates: any): Promise<void> {
        const data = this.readData(collection);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            // Handle nested updates (like "metadata.updatedAt")
            const updatedItem = { ...data[index] };

            Object.keys(updates).forEach(key => {
                if (key.includes('.')) {
                    const parts = key.split('.');
                    let current = updatedItem;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (!current[parts[i]]) current[parts[i]] = {};
                        current = current[parts[i]];
                    }
                    current[parts[parts.length - 1]] = updates[key];
                } else {
                    updatedItem[key] = updates[key];
                }
            });

            data[index] = updatedItem;
            this.writeData(collection, data);
        }
    }

    static async delete(collection: string, id: string): Promise<void> {
        const data = this.readData(collection);
        const filteredData = data.filter(item => item.id !== id);
        this.writeData(collection, filteredData);
    }

    static async query(collection: string, filterFn: (item: any) => boolean): Promise<any[]> {
        const data = this.readData(collection);
        return data.filter(filterFn);
    }
}
