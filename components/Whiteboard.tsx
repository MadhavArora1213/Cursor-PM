"use client";

import React, { useRef, useEffect, useState } from 'react';
import { updateWorkshopWhiteboard } from '@/lib/firebase/collaborationService';
import { ref, onValue, off } from 'firebase/database';
import { realtimeDB } from '@/lib/firebase/config';

interface WhiteboardProps {
    workshopId: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ workshopId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#6366f1');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Sync from RTDB
        const whiteboardRef = ref(realtimeDB, `workshops/${workshopId}/whiteboardData`);
        const listener = onValue(whiteboardRef, (snapshot) => {
            const dataURL = snapshot.val();
            if (dataURL) {
                const img = new Image();
                img.onload = () => {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(img, 0, 0);
                };
                img.src = dataURL;
            }
        });

        return () => off(whiteboardRef, 'value', listener);
    }, [workshopId]);

    const startDrawing = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
    };

    const endDrawing = async () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const canvas = canvasRef.current;
        if (canvas) {
            const dataURL = canvas.toDataURL();
            await updateWorkshopWhiteboard(workshopId, dataURL);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#000000'].map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                <button
                    onClick={() => {
                        const canvas = canvasRef.current;
                        const ctx = canvas?.getContext('2d');
                        ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
                        endDrawing();
                    }}
                    className="text-xs font-bold text-red-500 hover:underline"
                >
                    Clear Board
                </button>
            </div>
            <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={endDrawing}
                onMouseLeave={endDrawing}
                className="w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-white/5 cursor-crosshair shadow-inner"
            />
        </div>
    );
};
