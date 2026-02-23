import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const workspaceId = formData.get('workspaceId') as string | null;

        if (!file || !workspaceId) {
            return NextResponse.json({ error: 'File and workspaceId are required' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Store in local project root `/uploads` folder
        const uploadDir = join(process.cwd(), 'uploads', workspaceId);

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        const filePath = join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        // Serve URL endpoint we will create next
        const fileUrl = `/api/files/${workspaceId}/${fileName}`;

        return NextResponse.json({ success: true, fileUrl, fileName });
    } catch (error: any) {
        console.error("Local upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
