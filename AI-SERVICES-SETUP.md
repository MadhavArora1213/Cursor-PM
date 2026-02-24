# Module 5 AI Services — Setup Guide

This document explains how to start all three local AI services for the full pipeline.

---

## 🤖 1. Ollama (Qwen LLM)

Used for: AI-powered summarization + Strategy generation (hypotheses, user stories, OKRs)

### Install & Start
```powershell
# 1. Download OllamaSetup.exe from https://ollama.com/download
#    or run:
Invoke-WebRequest -Uri https://ollama.com/download/OllamaSetup.exe -OutFile OllamaSetup.exe
.\OllamaSetup.exe

# 2. Pull the Qwen model (do this once)
ollama pull qwen2.5

# 3. Ollama starts automatically as a Windows service
#    Verify at: http://localhost:11434/api/tags
```

### Verify
Open your browser at: http://localhost:11434/api/tags
You should see: `{"models":[{"name":"qwen2.5",...}]}`

---

## 🗄️ 2. ChromaDB (Vector Database)

Used for: Semantic search across research documents

### Install & Start
```powershell
# 1. Install Python if not installed: https://www.python.org/downloads/
# 2. Install ChromaDB
pip install chromadb

# 3. Start ChromaDB server (run this from the cursorprod directory)
chroma run --path ./chroma --port 8000
```

### Verify
Open: http://localhost:8000/api/v1/heartbeat
You should see: `{"nanosecond heartbeat":...}`

---

## 🎙️ 3. Whisper.cpp (Audio Transcription)

Used for: Transcribing .mp3, .wav, .m4a audio interview files

### Install & Start (Windows)
```powershell
# 1. Clone whisper.cpp into the cursorprod directory
cd cursorprod
git clone https://github.com/ggerganov/whisper.cpp

# 2. Build with CMake (requires Visual Studio Build Tools)
cd whisper.cpp
cmake -B build
cmake --build build --config Release -j4

# 3. Download the base English model
bash models/download-ggml-model.sh base.en
# OR on Windows PowerShell:
Invoke-WebRequest -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" -OutFile "models/ggml-base.en.bin"
```

### Expected file locations:
- Binary: `cursorprod/whisper.cpp/build/bin/whisper-cli.exe`
- Model:  `cursorprod/whisper.cpp/models/ggml-base.en.bin`

---

## 🔥 Full Pipeline (All Services Running)

When all three services are running, the `/api/analyze` pipeline provides:

| Step | Tool | Output |
|------|------|--------|
| Text Extraction | pdf-parse | Raw text from PDFs/TXT |
| Audio Transcription | Whisper.cpp | Real transcription from audio |
| Sentiment Analysis | VADER (sentiment pkg) | positive/negative/neutral/mixed |
| Theme Extraction | HF-style keywords | Up to 5 product domain themes |
| Summarization | **Ollama/Qwen** | AI-generated executive summary |
| Vector Indexing | **ChromaDB** | Semantic search enabled |

The Strategy Planner (`/dashboard/strategy`) also uses **Ollama/Qwen** to generate:
- Product hypotheses
- User stories
- OKRs

---

## ✅ Graceful Fallbacks

If any service is offline, the app continues to work:
- **Ollama offline** → Uses extractive summarizer (sentence scoring)
- **ChromaDB offline** → Skips vector indexing (search unavailable)
- **Whisper.cpp missing** → Returns placeholder text with real instructions

---

## 🧪 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze` | POST | Run full AI pipeline on uploaded file |
| `/api/generate` | POST | Generate strategy from research (Ollama/Qwen) |
| `/api/search` | POST | Semantic search via ChromaDB |
| `/api/search` | GET | ChromaDB index stats |
| `/api/upload` | POST | Upload file to local storage |
| `/api/files/[workspaceId]/[fileName]` | GET | Serve uploaded file |
