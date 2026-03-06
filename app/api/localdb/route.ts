import { NextResponse } from 'next/server';
import { LocalDB } from '@/lib/localDB';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const collection = searchParams.get('collection');
        const id = searchParams.get('id');
        const workspaceId = searchParams.get('workspaceId');
        const userId = searchParams.get('userId');

        if (!collection) return NextResponse.json({ error: 'Collection required' }, { status: 400 });

        if (id) {
            const item = await LocalDB.getById(collection, id);
            return NextResponse.json(item);
        }

        let items = await LocalDB.getAll(collection);

        if (workspaceId) {
            items = items.filter(item => item.workspaceId === workspaceId);
        }

        if (userId && collection === 'workspaces') {
            items = items.filter(item => item.members?.some((m: any) => m.userId === userId));
        }

        return NextResponse.json(items);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { collection, action, id, data } = body;

        if (!collection) return NextResponse.json({ error: 'Collection required' }, { status: 400 });

        switch (action) {
            case 'add':
                const newId = await LocalDB.add(collection, data);
                return NextResponse.json({ id: newId });
            case 'update':
                await LocalDB.update(collection, id, data);
                return NextResponse.json({ success: true });
            case 'delete':
                await LocalDB.delete(collection, id);
                return NextResponse.json({ success: true });
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
