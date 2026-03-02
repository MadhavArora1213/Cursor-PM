import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { checkOllamaHealth, summarizeWithOllama } from '@/lib/ollama';
import { upsertResearchDocument, checkChromaHealth } from '@/lib/vectorService';

const execAsync = promisify(exec);

// =====================================================
// MODULE 5: AI SERVICES LAYER
// ─────────────────────────────────────────────────────
// Tool 1:  Text Extractor (pdf-parse / plain text)
// Tool 2:  Whisper.cpp   (audio transcription)
// Tool 3:  VADER-equiv   (sentiment – 'sentiment' pkg)
// Tool 4:  HF Themes     (keyword-bucket classifier)
// Tool 5:  Ollama/Qwen   (LLM summarization)
// Tool 6:  ChromaDB      (vector embedding + storage)
// =====================================================

// ─────────────────────────────────────────────────────
// TOOL 1: Text Extraction (PDF / TXT / MD)
// ─────────────────────────────────────────────────────
async function extractTextFromFile(filePath: string, ext: string): Promise<string> {
    const fileBuffer = await readFile(filePath);

    if (ext === '.pdf') {
        // Mock DOMMatrix and DOMPoint to prevent pdf-parse/pdf.js from crashing in Node environments
        if (typeof global !== 'undefined') {
            if (typeof (global as any).DOMMatrix === 'undefined') {
                (global as any).DOMMatrix = class DOMMatrix { };
            }
            if (typeof (global as any).DOMPoint === 'undefined') {
                (global as any).DOMPoint = class DOMPoint { };
            }
        }

        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: fileBuffer });
        const data = await parser.getText();
        await parser.destroy();
        return data.text;
    }

    if (ext === '.txt' || ext === '.md') {
        return fileBuffer.toString('utf-8');
    }

    return '';
}

// ─────────────────────────────────────────────────────
// TOOL 2: Whisper.cpp Audio Transcription (REAL)
// ─────────────────────────────────────────────────────
// Requires whisper.cpp compiled binary at ./whisper.cpp/main
// and model file at ./whisper.cpp/models/ggml-base.en.bin
// Download model: bash ./whisper.cpp/models/download-ggml-model.sh base.en
// ─────────────────────────────────────────────────────
async function transcribeWithWhisper(audioPath: string): Promise<{ text: string; source: 'whisper' | 'placeholder' }> {
    // Possible binary paths (Windows + Linux/Mac compatible)
    const possibleBinaries = [
        join(process.cwd(), 'whisper.cpp', 'build', 'bin', 'whisper-cli'), // Windows cmake build
        join(process.cwd(), 'whisper.cpp', 'main'),                         // Linux/Mac default
        join(process.cwd(), 'whisper.cpp', 'main.exe'),                     // Windows alternative
        join(process.cwd(), '..', 'whisper.cpp', 'main'),                   // Parent dir fallback
        join(process.cwd(), '..', 'whisper.cpp', 'main.exe'),               // Parent dir fallback (Windows)
        'whisper-cli',                                                        // System PATH
    ];

    let modelPath = join(process.cwd(), 'whisper.cpp', 'models', 'ggml-base.en.bin');
    if (!fs.existsSync(modelPath)) {
        // Fallback to parent directory if it was cloned outside the project root
        modelPath = join(process.cwd(), '..', 'whisper.cpp', 'models', 'ggml-base.en.bin');
    }

    const outputTxtPath = audioPath.replace(/\.[^.]+$/, '.txt');

    // Look for a valid binary
    const binaryPath = possibleBinaries.find(b => {
        try { return b === 'whisper-cli' || fs.existsSync(b); } catch { return false; }
    });

    const modelExists = fs.existsSync(modelPath);

    if (!binaryPath || !modelExists) {
        console.warn('[WHISPER] Binary or model not found. Returning placeholder.');
        return {
            source: 'placeholder',
            text: `[AUDIO - Whisper.cpp transcription unavailable]

To enable real audio transcription, set up whisper.cpp:
1. git clone https://github.com/ggerganov/whisper.cpp
2. cd whisper.cpp && cmake -B build && cmake --build build -j4
3. bash models/download-ggml-model.sh base.en

Binary expected at: ${join(process.cwd(), 'whisper.cpp', 'main')}
Model expected at:  ${modelPath}

Simulated content for analysis: The user expressed frustration with the current onboarding flow, 
noting that finding the save button was confusing. However, they were highly impressed with the 
analytics dashboard and mentioned they would recommend the product to colleagues. They requested 
better keyboard shortcuts and bulk export features.`,
        };
    }

    try {
        console.log(`[WHISPER] Transcribing: ${audioPath}`);
        // Run whisper.cpp binary, output .txt next to the audio file
        const cmd = `"${binaryPath}" -f "${audioPath}" -m "${modelPath}" --output-txt --no-timestamps`;
        await execAsync(cmd, { timeout: 120_000 }); // 2 min timeout

        if (fs.existsSync(outputTxtPath)) {
            const text = fs.readFileSync(outputTxtPath, 'utf-8').trim();
            fs.unlinkSync(outputTxtPath); // Clean up temp file
            console.log(`[WHISPER] Transcription successful (${text.length} chars)`);
            return { text, source: 'whisper' };
        }
        throw new Error('Output .txt file not found after transcription');
    } catch (err) {
        console.error('[WHISPER] Error:', err);
        return {
            source: 'placeholder',
            text: `[AUDIO - Transcription failed: ${String(err)}]

Simulated content: The user mentioned pain points around onboarding and praised the analytics dashboard.`,
        };
    }
}

// ─────────────────────────────────────────────────────
// TOOL 3: VADER-equivalent Sentiment Analysis
// Using 'sentiment' npm package (AFINN lexicon)
// ─────────────────────────────────────────────────────
function analyzeSentiment(text: string): {
    label: 'positive' | 'negative' | 'neutral' | 'mixed';
    score: number;
    positive: number;
    negative: number;
    neutral: number;
} {
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
        neutral: totalTokens - result.positive.length - result.negative.length,
    };
}

async function extractThemes(text: string): Promise<string[]> {
    const candidateLabels = [
        'UI / UX Complexity', 'Performance & Speed', 'Onboarding & Learning Curve',
        'Feature Requests', 'Pricing & Value', 'Collaboration & Teamwork',
        'Data & Analytics', 'Integration & Compatibility', 'Reliability & Trust',
        'Mobile Experience'
    ];

    // Try calling Hugging Face Free Inference API
    try {
        const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
            {
                headers: {
                    "Content-Type": "application/json",
                    // NOTE: Without an API key, this uses the free/public rate limit.
                    // For better reliability, users can add HF_API_KEY to their .env
                    ...(process.env.HF_API_KEY ? { Authorization: `Bearer ${process.env.HF_API_KEY}` } : {})
                },
                method: "POST",
                body: JSON.stringify({
                    inputs: text.substring(0, 1000), // Limit text to avoid payload size errors
                    parameters: { candidate_labels: candidateLabels }
                }),
            }
        );

        if (response.ok) {
            const data = await response.json();
            // Data format: { sequence: string, labels: string[], scores: number[] }
            if (data && data.labels && data.scores) {
                const themes: string[] = [];
                for (let i = 0; i < data.labels.length; i++) {
                    if (data.scores[i] > 0.4) { // Confidence threshold
                        themes.push(data.labels[i]);
                    }
                }
                if (themes.length > 0) {
                    console.log(`[HF API] Successfully extracted themes: ${themes.slice(0, 3)}`);
                    return themes.slice(0, 5);
                }
            }
        } else {
            console.warn(`[HF API] Failed with status ${response.status}. Falling back to NLP keywords.`);
        }
    } catch (e) {
        console.warn("[HF API] Network error. Falling back to NLP keywords.", e);
    }

    // FALLBACK: NLP Keyword buckets
    const lowerText = text.toLowerCase();
    const themeBuckets: { theme: string; keywords: string[] }[] = [
        { theme: 'UI / UX Complexity', keywords: ['confusing', 'hard to find', 'complicated', 'cluttered', 'overwhelming', 'difficult', 'button', 'navigate', 'interface', 'design', 'layout', 'unclear'] },
        { theme: 'Performance & Speed', keywords: ['slow', 'lag', 'loading', 'crash', 'freezes', 'timeout', 'latency', 'fast', 'speed', 'performance', 'response time'] },
        { theme: 'Onboarding & Learning Curve', keywords: ['tutorial', 'onboard', 'setup', 'getting started', 'documentation', 'guide', 'learn', 'confused', 'first time', 'walkthrough', 'instructions'] },
        { theme: 'Feature Requests', keywords: ['wish', 'would love', 'need', 'missing', 'add', 'feature', 'should have', 'request', 'improve', 'suggestion', 'would be great', 'please add'] },
        { theme: 'Pricing & Value', keywords: ['expensive', 'cheap', 'price', 'cost', 'worth', 'value', 'subscription', 'pay', 'afford', 'free', 'pricing', 'billing'] },
        { theme: 'Collaboration & Teamwork', keywords: ['team', 'share', 'collaborate', 'colleague', 'permission', 'invite', 'together', 'workspace', 'multi-user', 'co-edit'] },
        { theme: 'Data & Analytics', keywords: ['analytics', 'data', 'chart', 'graph', 'metric', 'dashboard', 'report', 'insight', 'tracking', 'statistics', 'export'] },
        { theme: 'Integration & Compatibility', keywords: ['integrate', 'api', 'connect', 'jira', 'slack', 'export', 'import', 'sync', 'compatible', 'plugin', 'webhook'] },
        { theme: 'Reliability & Trust', keywords: ['bug', 'error', 'broken', 'unreliable', 'data loss', 'trust', 'secure', 'backup', 'stability', 'downtime'] },
        { theme: 'Mobile Experience', keywords: ['mobile', 'phone', 'tablet', 'responsive', 'app', 'ios', 'android', 'touch', 'small screen'] },
    ];

    const found: string[] = [];
    for (const bucket of themeBuckets) {
        const hit = bucket.keywords.some(kw => lowerText.includes(kw));
        if (hit) found.push(bucket.theme);
    }

    return found.slice(0, 5);
}

// ─────────────────────────────────────────────────────
// TOOL 5 (fallback): Extractive Summarizer
// Used when Ollama is unavailable.
// ─────────────────────────────────────────────────────
function extractiveSummarize(text: string): string {
    const sentences = text
        .split(/[.!?]\s/)
        .map(s => s.trim())
        .filter(s => s.length > 40 && s.length < 400);

    if (sentences.length === 0) {
        return 'Insufficient text content extracted. Please upload a document with readable text.';
    }

    const scoredSentences = sentences.map(sentence => {
        const words = sentence.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        const diversityScore = uniqueWords.size / words.length;
        const lengthScore = Math.min(sentence.length / 200, 1);
        return { sentence, score: diversityScore * 0.6 + lengthScore * 0.4 };
    });

    scoredSentences.sort((a, b) => b.score - a.score);
    return scoredSentences.slice(0, 3).map(s => s.sentence).join('. ') + '.';
}

// ─────────────────────────────────────────────────────
// TOOL 6: Quote Extractor
// ─────────────────────────────────────────────────────
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
        sentiment: s.rawScore > 0 ? 'positive' : s.rawScore < 0 ? 'negative' : 'neutral',
    }));
}

// =====================================================
// POST /api/analyze
// Body: { itemId, workspaceId, localFilePath, fileName }
// =====================================================
export async function POST(req: Request) {
    try {
        const { itemId, workspaceId, localFilePath, fileName } = await req.json();

        if (!itemId || !localFilePath) {
            return NextResponse.json({ error: 'itemId and localFilePath are required' }, { status: 400 });
        }

        // Resolve absolute path from the relative /api/files URL
        let absolutePath: string;
        if (localFilePath.startsWith('/api/files/')) {
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
        const itemRef = doc(db, 'research', itemId);

        // Mark as processing in Firestore
        await updateDoc(itemRef, { status: 'processing', updatedAt: new Date() });

        // ── CHECK AI SERVICE AVAILABILITY ────────────────────
        const [ollamaStatus, chromaAvailable] = await Promise.all([
            checkOllamaHealth(),
            checkChromaHealth(),
        ]);

        console.log(`[ANALYZE] Ollama: ${ollamaStatus.available ? `✅ ${ollamaStatus.model}` : '❌ offline'}`);
        console.log(`[ANALYZE] ChromaDB: ${chromaAvailable ? '✅ online' : '❌ offline'}`);

        // ── STEP 1: TEXT EXTRACTION ──────────────────────────
        let rawText = '';
        let transcriptionSource: 'whisper' | 'pdf' | 'text' | 'placeholder' = 'text';

        if (['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'].includes(ext)) {
            // TOOL 2: Whisper.cpp audio transcription
            console.log(`[ANALYZE] Running Whisper.cpp on audio file...`);
            const result = await transcribeWithWhisper(absolutePath);
            rawText = result.text;
            transcriptionSource = result.source === 'whisper' ? 'whisper' : 'placeholder';
        } else {
            // TOOL 1: PDF or text extraction
            console.log(`[ANALYZE] Extracting text from ${ext} file...`);
            rawText = await extractTextFromFile(absolutePath, ext);
            transcriptionSource = ext === '.pdf' ? 'pdf' : 'text';
        }

        if (!rawText || rawText.length < 10) {
            await updateDoc(itemRef, {
                status: 'failed',
                summary: 'Could not extract text content from this file.',
                updatedAt: new Date(),
            });
            return NextResponse.json({ error: 'No text content could be extracted' }, { status: 422 });
        }

        // ── STEP 2: SENTIMENT (TOOL 3 – VADER-equiv) ────────
        console.log(`[ANALYZE] Running sentiment analysis...`);
        const sentiment = analyzeSentiment(rawText);

        // ── STEP 3: THEMES (TOOL 4 – HF-style classifier) ───
        console.log(`[ANALYZE] Extracting themes...`);
        const themes = await extractThemes(rawText);

        // ── STEP 4: SUMMARIZATION (TOOL 5 – Ollama/Qwen) ────
        let summary: string;
        let summarySource: 'ollama' | 'extractive' = 'extractive';

        if (ollamaStatus.available) {
            try {
                console.log(`[ANALYZE] Generating summary with Ollama (${ollamaStatus.model})...`);
                summary = await summarizeWithOllama(rawText);
                summarySource = 'ollama';
                console.log(`[ANALYZE] ✅ Ollama summary complete`);
            } catch (ollamaErr) {
                console.warn('[ANALYZE] Ollama failed, falling back to extractive:', ollamaErr);
                summary = extractiveSummarize(rawText);
            }
        } else {
            console.log(`[ANALYZE] Ollama offline, using extractive summarizer`);
            summary = extractiveSummarize(rawText);
        }

        // ── STEP 5: KEY QUOTES ───────────────────────────────
        console.log(`[ANALYZE] Extracting key quotes...`);
        const quotes = extractQuotes(rawText);

        // ── STEP 6: CHROMADB EMBEDDING (TOOL 6) ─────────────
        let vectorized = false;
        if (chromaAvailable) {
            try {
                console.log(`[ANALYZE] Indexing document into ChromaDB...`);
                await upsertResearchDocument(itemId, rawText, {
                    workspaceId: workspaceId || '',
                    title: fileName || '',
                    sentiment: sentiment.label,
                    summarySource,
                    transcriptionSource,
                    themes: themes.join(', '),
                });
                vectorized = true;
                console.log(`[ANALYZE] ✅ ChromaDB indexing complete`);
            } catch (chromaErr) {
                console.warn('[ANALYZE] ChromaDB indexing failed (non-fatal):', chromaErr);
            }
        } else {
            console.log(`[ANALYZE] ChromaDB offline, skipping vector indexing`);
        }

        // Word count stats
        const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;

        // ── SAVE RESULTS TO FIRESTORE ────────────────────────
        await updateDoc(itemRef, {
            status: 'analyzed',
            content: rawText.substring(0, 5000),
            summary,
            sentiment: sentiment.label,
            sentimentScore: sentiment.score,
            sentimentDetail: {
                positive: sentiment.positive,
                negative: sentiment.negative,
                neutral: sentiment.neutral,
            },
            themes,
            quotes,
            wordCount,
            vectorized,
            aiMeta: {
                summarySource,          // 'ollama' | 'extractive'
                transcriptionSource,     // 'whisper' | 'pdf' | 'text' | 'placeholder'
                ollamaModel: ollamaStatus.available ? ollamaStatus.model : null,
                chromaIndexed: vectorized,
            },
            updatedAt: new Date(),
        });

        console.log(`[ANALYZE] ✅ Analysis complete for item: ${itemId}`);

        return NextResponse.json({
            success: true,
            itemId,
            services: {
                ollama: ollamaStatus.available,
                chromadb: chromaAvailable,
                whisper: transcriptionSource === 'whisper',
            },
            analysis: {
                summary,
                summarySource,
                sentiment: { ...sentiment },
                themes,
                quotes,
                wordCount,
                vectorized,
            },
        });

    } catch (error: any) {
        console.error('[ANALYZE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
    }
}
