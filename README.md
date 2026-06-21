# Submit and Heal 🩺

An app where users submit a broken app's GitHub repo link + error description
and an AI agent system diagnoses and fixes it.

---

## Project Structure

```
submit-and-heal/
├── frontend/     # Next.js (App Router, TypeScript, Tailwind CSS)
└── backend/      # FastAPI (Python)
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ and **npm** (or pnpm / yarn)
- **Python** 3.10+
- **pip**

---

### 1. Backend (FastAPI)

```bash
# Navigate to the backend folder
cd backend

# (Recommended) Create a virtual environment
python -m venv .venv
# Activate on Windows:
.venv\Scripts\activate
# Activate on macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy the env example (add real API keys later)
cp .env.example .env   # or copy .env.example .env on Windows

# Start the server (hot-reload enabled)
uvicorn main:app --reload --port 8000
```

The backend will be available at **http://localhost:8000**  
Interactive API docs: **http://localhost:8000/docs**

---

### 2. Frontend (Next.js)

```bash
# Navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at **http://localhost:3000**

---

## Environment Variables

| File | Purpose |
|------|---------|
| `backend/.env` | Backend secrets (API keys, tokens). **Never commit real values.** |
| `frontend/.env.local` | Frontend public env vars (e.g., `NEXT_PUBLIC_API_URL`). |

### Key Variables

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
Change this to your deployed backend URL when you go to production.

---

## API Reference

### `POST /api/submit`

Accepts a GitHub repo URL and error description.

**Request body:**
```json
{
  "repo_url": "https://github.com/user/broken-repo",
  "error_description": "TypeError: Cannot read properties of undefined..."
}
```

**Response:**
```json
{
  "status": "received",
  "repo_url": "https://github.com/user/broken-repo",
  "error_description": "TypeError: Cannot read properties of undefined...",
  "message": "Backend received your submission successfully"
}
```

---

## Roadmap

- [x] **Step 1** — Basic frontend ↔ backend connection (current step)
- [ ] **Step 2** — GitHub repo cloning + static analysis
- [ ] **Step 3** — AI agent integration (diagnosis)
- [ ] **Step 4** — Automated fix generation + PR creation
