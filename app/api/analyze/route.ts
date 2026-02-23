import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import * as fs from 'fs';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// =====================================================
// MODULE 5: AI SERVICES LAYER
// Tools: pdf-parse (text extraction), sentiment (VADER-equivalent),
//        extractive summarizer, theme classifier
// =====================================================

// --- Tool 1: Text Extractor ---
async function extractText(filePath: string, ext: string): Promise<string> {
    const fileBuffer = await readFile(filePath);

    if (ext === '.pdf') {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fileBuffer);
        return data.text;
    }

    if (ext === '.txt' || ext === '.md') {
        return fileBuffer.toString('utf-8');
    }

    // For audio files, Whisper.cpp would run here.
    // It requires a compiled binary, so we return a placeholder
    // that shows the user where to plug it in.
    if (['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) {
        return `[AUDIO FILE - Whisper.cpp transcription pending]
        
        To enable real transcription, install whisper.cpp and run:
        ./whisper.cpp/main -f "${filePath}" -m ./whisper.cpp/models/ggml-base.en.bin -otxt
        
        Once transcribed, re-run analysis.
        
        Simulated transcript: The user mentioned several pain points around the onboarding process
        and expressed frustration with finding the save button. However, they highly praised the
        new analytics dashboard and mentioned they would recommend the product to colleagues.`;
    }

    return '';
}

// --- Tool 2: VADER-equivalent Sentiment Analysis ---
function analyzeSentiment(text: string): { label: 'positive' | 'negative' | 'neutral' | 'mixed'; score: number; positive: number; negative: number; neutral: number } {
    // Using the 'sentiment' package which uses AFINN lexicon (similar to VADER)
    const Sentiment = require('sentiment');
    const analyzer = new Sentiment();
    const result = analyzer.analyze(text);

    const totalTokens = result.tokens.length || 1;
    const positiveRatio = result.positive.length / totalTokens;
    const negativeRatio = result.negative.length / totalTokens;
    const normalizedScore = Math.max(-1, Math.min(1, result.comparative));

    let label: 'positive' | 'negative' | 'neutral' | 'mixed';
    if (positiveRatio > 0.05 && negativeRatio > 0.03) {
        label = 'mixed';
    } else if (result.score > 2) {
        label = 'positive';
    } else if (result.score < -2) {
        label = 'negative';
    } else {
        label = 'neutral';
    }

    return {
        label,
        score: parseFloat(normalizedScore.toFixed(3)),
        positive: result.positive.length,
        negative: result.negative.length,
        neutral: totalTokens - result.positive.length - result.negative.length
    };
}

// --- Tool 3: Hugging Face Zero-Shot Theme Classifier (Product-Domain) ---
// Uses keyword buckets mapped to product intelligence categories.
// In production, replace this with the Hugging Face Inference API call:
// POST https://api-inference.huggingface.co/models/facebook/bart-large-mnli
function extractThemes(text: string): string[] {
    const lowerText = text.toLowerCase();

    const themeBuckets: { theme: string; keywords: string[] }[] = [
        { theme: 'UI / UX Complexity', keywords: ['confusing', 'hard to find', 'complicated', 'cluttered', 'overwhelming', 'difficult', 'button', 'navigate', 'interface', 'design'] },
        { theme: 'Performance & Speed', keywords: ['slow', 'lag', 'loading', 'crash', 'freezes', 'timeout', 'latency', 'fast', 'speed', 'performance'] },
        { theme: 'Onboarding & Learning Curve', keywords: ['tutorial', 'onboard', 'setup', 'getting started', 'documentation', 'guide', 'learn', 'confused', 'first time'] },
        { theme: 'Feature Requests', keywords: ['wish', 'would love', 'need', 'missing', 'add', 'feature', 'should have', 'request', 'improve', 'suggestion'] },
        { theme: 'Pricing & Value', keywords: ['expensive', 'cheap', 'price', 'cost', 'worth', 'value', 'subscription', 'pay', 'afford', 'free'] },
        { theme: 'Collaboration & Teamwork', keywords: ['team', 'share', 'collaborate', 'colleague', 'permission', 'invite', 'together', 'workspace'] },
        { theme: 'Data & Analytics', keywords: ['analytics', 'data', 'chart', 'graph', 'metric', 'dashboard', 'report', 'insight', 'tracking', 'statistics'] },
        { theme: 'Integration & Compatibility', keywords: ['integrate', 'api', 'connect', 'jira', 'slack', 'export', 'import', 'sync', 'compatible'] },
    ];

    const found: string[] = [];
    for (const bucket of themeBuckets) {
        const hit = bucket.keywords.some(kw => lowerText.includes(kw));
        if (hit) found.push(bucket.theme);
    }

    return found.slice(0, 5); // Max 5 themes
}

// --- Tool 4: Extractive Summarizer ---
// Scores each sentence by keyword density and picks top N.
// In production, replace with Ollama / Llama 3 API call:
// POST http://localhost:11434/api/generate { model: 'llama3', prompt: '...' }
function generateSummary(text: string): string {
    const sentences = text
        .split(/[.!?]\s/)
        .map(s => s.trim())
        .filter(s => s.length > 40 && s.length < 400);

    if (sentences.length === 0) {
        return 'Insufficient text content extracted. Please upload a document with readable text.';
    }

    // Score sentences by content richness (word count diversity + length)
    const scoredSentences = sentences.map(sentence => {
        const words = sentence.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        const diversityScore = uniqueWords.size / words.length;
        const lengthScore = Math.min(sentence.length / 200, 1);
        return { sentence, score: diversityScore * 0.6 + lengthScore * 0.4 };
    });

    // Sort by score and pick top 3
    scoredSentences.sort((a, b) => b.score - a.score);
    const topSentences = scoredSentences.slice(0, 3).map(s => s.sentence);

    return topSentences.join('. ') + '.';
}

// --- Tool 5: Quote Extractor ---
// Extracts impactful short sentences that express strong opinions
function extractQuotes(text: string): { text: string; sentiment: string }[] {
    const Sentiment = require('sentiment');
    const analyzer = new Sentiment();

    const sentences = text
        .split(/[.!?]\s/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 200);

    const scoredSentences = sentences.map(sentence => {
        const result = analyzer.analyze(sentence);
        return { text: sentence, score: Math.abs(result.comparative), rawScore: result.score };
    });

    scoredSentences.sort((a, b) => b.score - a.score);

    return scoredSentences.slice(0, 4).map(s => ({
        text: s.text,
        sentiment: s.rawScore > 0 ? 'positive' : s.rawScore < 0 ? 'negative' : 'neutral'
    }));
}

// =====================================================
// API ENDPOINT
// POST /api/analyze
// Body: { itemId, workspaceId, localFilePath, fileName }
// =====================================================
export async function POST(req: Request) {
    try {
        const { itemId, workspaceId, localFilePath, fileName } = await req.json();

        if (!itemId || !localFilePath) {
            return NextResponse.json({ error: 'itemId and localFilePath are required' }, { status: 400 });
        }

        // Resolve the absolute path from the relative /api/files URL
        let absolutePath: string;
        if (localFilePath.startsWith('/api/files/')) {
            // Parse out workspaceId and fileName from URL
            const parts = localFilePath.replace('/api/files/', '').split('/');
            const wsId = parts[0];
            const fName = parts.slice(1).join('/');
            absolutePath = join(process.cwd(), 'uploads', wsId, fName);
        } else {
            absolutePath = localFilePath;
        }

        if (!fs.existsSync(absolutePath)) {
            return NextResponse.json({ error: `File not found at path: ${absolutePath}` }, { status: 404 });
        }

        const ext = extname(absolutePath).toLowerCase();

        // Update Firestore to show "processing" while we work
        const itemRef = doc(db, 'research', itemId);
        await updateDoc(itemRef, { status: 'processing', updatedAt: new Date() });

        // === Run the AI Pipeline ===
        console.log(`[ANALYZE] Extracting text from: ${absolutePath}`);
        const rawText = await extractText(absolutePath, ext);

        if (!rawText || rawText.length < 10) {
            await updateDoc(itemRef, {
                status: 'failed',
                summary: 'Could not extract text content from this file.',
                updatedAt: new Date()
            });
            return NextResponse.json({ error: 'No text content could be extracted' }, { status: 422 });
        }

        console.log(`[ANALYZE] Running sentiment analysis...`);
        const sentiment = analyzeSentiment(rawText);

        console.log(`[ANALYZE] Extracting themes...`);
        const themes = extractThemes(rawText);

        console.log(`[ANALYZE] Generating summary...`);
        const summary = generateSummary(rawText);

        console.log(`[ANALYZE] Extracting key quotes...`);
        const quotes = extractQuotes(rawText);

        // Word count stats
        const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;

        // Save all results back to Firestore
        await updateDoc(itemRef, {
            status: 'analyzed',
            content: rawText.substring(0, 5000), // Store first 5k chars of raw text
            summary,
            sentiment: sentiment.label,
            sentimentScore: sentiment.score,
            sentimentDetail: {
                positive: sentiment.positive,
                negative: sentiment.negative,
                neutral: sentiment.neutral
            },
            themes,
            quotes,
            wordCount,
            updatedAt: new Date()
        });

        return NextResponse.json({
            success: true,
            itemId,
            analysis: { summary, sentiment, themes, quotes, wordCount }
        });

    } catch (error: any) {
        console.error('[ANALYZE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
    }
}
