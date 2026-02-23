import { NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';

export async function GET(req: Request, context: any) {
    try {
        const params = await context.params;
        const { workspaceId, fileName } = params;
        const filePath = join(process.cwd(), 'uploads', workspaceId, fileName);

        if (!fs.existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        const buffer = await readFile(filePath);

        // Very basic mime typing for generic things (in real world, use a library like mime-types)
        let contentType = 'application/octet-stream';
        if (fileName.endsWith('.pdf')) contentType = 'application/pdf';
        else if (fileName.endsWith('.txt')) contentType = 'text/plain';
        else if (fileName.endsWith('.mp3')) contentType = 'audio/mpeg';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${fileName}"`
            }
        });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}

export async function DELETE(req: Request, context: any) {
    try {
        const params = await context.params;
        const { workspaceId, fileName } = params;
        const filePath = join(process.cwd(), 'uploads', workspaceId, fileName);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: true, message: 'Already deleted or not found' });
        }

        await unlink(filePath);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
