# Submit & Heal 🩺
> Autonomous AI debugging and deployment system

## What it does
Paste a broken GitHub repo → AI agents diagnose the 
bug, fix the code, verify the fix in a sandbox, 
and open a GitHub PR — fully autonomous.

## Tech Stack
- Frontend: Next.js + TypeScript + Tailwind (Vercel)
- Backend: FastAPI + LangGraph (Render)
- AI: Google Gemini 3.1 Flash Lite
- Sandbox: E2B Code Interpreter
- Memory: Supabase pgvector (RAG)
- Orchestration: LangGraph multi-agent graph

## Agents
1. Intake Agent — clones repo, reads files
2. Diagnosis Agent — finds root cause using RAG memory
3. Fix Agent — generates complete code patches
4. Verify Agent — runs fixed code in E2B sandbox
5. Deploy Agent — opens GitHub PR with fix

## Supported Languages
Python, Java, JavaScript

## Local Development
Backend: cd backend && uvicorn main:app --reload
Frontend: cd frontend && npm run dev
