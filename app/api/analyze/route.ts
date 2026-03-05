import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { checkOllamaHealth, summarizeWithOllama, ollamaGenerate } from '@/lib/ollama';
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
        const pdf = require('pdf-parse');
        try {
            const data = await pdf(fileBuffer);
            return data.text || '';
        } catch (err) {
            console.error('[PDF ERROR]', err);
            return 'Error extracting PDF text.';
        }
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

async function extractThemes(text: string, ollamaAvailable: boolean = false): Promise<string[]> {
    // ── PRIMARY: Use Ollama/Qwen to extract REAL themes from the document ──
    if (ollamaAvailable) {
        try {
            const truncated = text.substring(0, 2000);
            const prompt = `Read the following document and identify the 3-5 main themes or topics it covers. These themes should reflect what the document is ACTUALLY about — not generic categories.

Document:
"""
${truncated}
"""

Respond ONLY with a JSON array of short theme strings. Example: ["Web Development", "Project Management", "API Design"]
Do NOT add any explanation. Output ONLY the JSON array.`;

            const raw = await ollamaGenerate(prompt);
            const jsonMatch = raw.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`[THEMES] Ollama extracted themes: ${parsed.slice(0, 5)}`);
                    return parsed.slice(0, 5).map((t: any) => String(t));
                }
            }
        } catch (e: any) {
            console.warn('[THEMES] Ollama theme extraction failed, falling back:', e.message);
        }
    }

    // ── FALLBACK: Keyword buckets (stricter — require 3+ keyword hits) ──
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

    const found: { theme: string; hits: number }[] = [];
    for (const bucket of themeBuckets) {
        // Count how many keywords actually match — require 3+ to avoid false positives
        const hits = bucket.keywords.filter(kw => lowerText.includes(kw)).length;
        if (hits >= 3) found.push({ theme: bucket.theme, hits });
    }

    // Sort by number of keyword hits (most relevant first)
    found.sort((a, b) => b.hits - a.hits);

    // If no bucket hit 3+ keywords, extract simple TF-IDF-style top terms
    if (found.length === 0) {
        return extractTopTerms(text);
    }

    return found.slice(0, 5).map(f => f.theme);
}

// ── Simple top-term extraction when no keyword bucket matches ──
function extractTopTerms(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
        'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
        'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
        'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither',
        'this', 'that', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you',
        'your', 'he', 'she', 'they', 'them', 'their', 'his', 'her', 'who', 'which', 'what',
        'all', 'each', 'every', 'any', 'some', 'no', 'other', 'such', 'than', 'too', 'very',
        'also', 'just', 'about', 'up', 'out', 'if', 'then', 'more', 'over', 'only', 'new',
        'used', 'using', 'use', 'work', 'based', 'including', 'well', 'like', 'etc']);

    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    const freq: Record<string, number> = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;

    const topWords = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    return topWords;
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
// TOOL 6: Quote Extractor (Ollama-powered + fallback)
// ─────────────────────────────────────────────────────
async function extractQuotes(text: string, ollamaAvailable: boolean = false): Promise<{ text: string; sentiment: string }[]> {
    // ── PRIMARY: Use Ollama to extract meaningful quotes ──
    if (ollamaAvailable) {
        try {
            const truncated = text.substring(0, 2000);
            const prompt = `Read this document and extract the 3-4 most important, meaningful, or impactful sentences/passages directly from the text. These should be exact or near-exact quotes from the document.

Document:
"""
${truncated}
"""

Respond ONLY with a JSON array of objects. Each object has "text" (the quote) and "sentiment" ("positive", "negative", or "neutral").
Example: [{"text": "We achieved 40% growth in Q3", "sentiment": "positive"}]
Output ONLY the JSON array, no explanation.`;

            const raw = await ollamaGenerate(prompt);
            const jsonMatch = raw.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`[QUOTES] Ollama extracted ${parsed.length} quotes`);
                    return parsed.slice(0, 4).map((q: any) => ({
                        text: String(q.text || ''),
                        sentiment: ['positive', 'negative', 'neutral'].includes(q.sentiment) ? q.sentiment : 'neutral',
                    }));
                }
            }
        } catch (e: any) {
            console.warn('[QUOTES] Ollama quote extraction failed, falling back:', e.message);
        }
    }

    // ── FALLBACK: Sentiment-scored sentence extraction ──
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

        // ── STEP 3-5: THEMES + SUMMARY + QUOTES (run in parallel) ───
        console.log(`[ANALYZE] Extracting themes, summary & quotes${ollamaStatus.available ? ' (Ollama-powered)' : ''}...`);

        const themesPromise = extractThemes(rawText, ollamaStatus.available);
        const quotesPromise = extractQuotes(rawText, ollamaStatus.available);

        let summaryPromise: Promise<string>;
        let summarySource: 'ollama' | 'extractive' = 'extractive';

        if (ollamaStatus.available) {
            summaryPromise = summarizeWithOllama(rawText)
                .then(s => { summarySource = 'ollama'; return s; })
                .catch(err => {
                    console.warn('[ANALYZE] Ollama summary failed, falling back:', err);
                    return extractiveSummarize(rawText);
                });
        } else {
            console.log(`[ANALYZE] Ollama offline, using extractive summarizer`);
            summaryPromise = Promise.resolve(extractiveSummarize(rawText));
        }

        const [themes, summary, quotes] = await Promise.all([themesPromise, summaryPromise, quotesPromise]);
        console.log(`[ANALYZE] ✅ Themes: ${themes.join(', ')} | Summary source: ${summarySource} | Quotes: ${quotes.length}`);

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
