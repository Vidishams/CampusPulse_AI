# CampusPulse AI

An AI-powered campus communication platform: faculty post notices (as a file
or plain text), the backend OCRs + summarizes + categorizes them, and
eligible students get them in a personalized feed with a real-time
notification the moment they're posted.

This is a **working, runnable core** of the full spec — read
"[What's built vs. what's next](#whats-built-vs-whats-next)" before you
present this anywhere, so you know exactly what you can speak to.

---

## Architecture

```
Frontend (React + Vite)  <-->  Backend (FastAPI)  <-->  MongoDB Atlas
        |                            |
        |                    Socket.IO (real-time)
        |                            |
        +---- REST (fetch) ---------+
                                     |
                          Hugging Face / Tesseract (AI)
```

- **Frontend**: React 18, React Router, plain CSS (design tokens in
  `styles/global.css`), Fetch API only, `socket.io-client` for the live
  notification bell.
- **Backend**: FastAPI, organized as `routes/` (HTTP handlers) →
  `services`-style logic inline in routes for CRUD, `ai/` (OCR,
  summarization, categorization — kept as separate importable functions so
  they're independently testable), `auth/` (JWT + role guards),
  `database/` (Motor async Mongo client), `socket/` (Socket.IO room
  manager).
- **Why this split**: routes stay thin (parse request → call a
  service/AI function → shape response), so the AI pipeline can be unit
  tested without spinning up the whole API, and swapped (e.g. lightweight
  extractive summarizer → real HF model) without touching routes.

### Key design decisions (useful for interviews)

- **JWT payload carries `role`**, so role-based route guards
  (`require_role("faculty", "admin")`) never need a DB round-trip just to
  check permissions.
- **AI Assistant is retrieval-first, not a free LLM call**: it classifies
  intent by keyword, queries MongoDB, and templates the answer from real
  documents. This guarantees it can't invent an exam date that doesn't
  exist — a stricter and cheaper approach than routing every question
  through a generative model, appropriate for the "answer only from DB
  data" requirement.
- **Summarization/categorization run in a lightweight mode by default**
  (`AI_LIGHTWEIGHT_MODE=true`): keyword scoring + extractive summarization,
  zero model download. Flip to `false` once you're ready to pull down the
  ~1.6GB `distilbart-cnn` / `bart-large-mnli` models — the interface
  (`summarize(text)`, `categorize(text)`) doesn't change either way.
- **Real-time notifications use Socket.IO rooms keyed by user ID**, not a
  broadcast-and-filter-on-client approach — the server only ever sends a
  notification to the students it's actually for.
- **Personalized feed matching happens in the Mongo query itself**
  (`department == mine OR null`, `semester == mine OR null`) rather than
  fetching everything and filtering in Python, so it scales as notices grow.

---

## What "launch-ready" actually requires, on top of what's built

| Area | Status | What's needed |
|---|---|---|
| Core CRUD + AI pipeline | ✅ Built | — |
| Real-time notifications | ✅ Built | — |
| Faculty approval workflow | ✅ Built | — |
| Admin account creation | ✅ Locked down | — |
| Password reset | ✅ Built | Wire real email sending (see note above) |
| Email verification | ✅ Built | Wire real email sending (see note above) |
| Empty states | ✅ Built | — |
| Error states + retry | ✅ Built | — |
| Mobile responsiveness | ✅ Built | Sidebar → slide-out drawer under 860px |
| Terms/privacy page | ✅ Built | Have your college's legal team review the copy |
| Real email delivery (SMTP) | ❌ Missing | One provider integration — see note above |
| Automated tests / CI | ❌ Missing | Phase 11/12 from the original spec |
| Hosting + real domain | ❌ Not deployed | See Deployment section below |

### Creating the first admin

```bash
cd backend
python scripts/create_admin.py
```
This prompts for an email, name, and password, and inserts an admin
account directly into MongoDB — it's a CLI script, not an API endpoint,
so admin creation is never reachable over HTTP with no gate in front of
it. Every admin after this one is created by an existing admin from the
**Manage Users** page in the app.

## What's built vs. what's next

**Fully working end-to-end:**
JWT auth (register/login, student & faculty only via public form) ·
**enrollment-roster verification** — students register with an SRN and
faculty with an Employee ID, both checked against a roster an admin
pre-loads (one at a time or via CSV bulk upload); department and
semester are taken from that roster record, not from what the signup
form submits, so nobody can self-declare a department/semester that
isn't real, and each SRN/Employee ID can only be claimed once ·
**email verification** (token-based, resend supported) · **password
reset** (forgot/reset flow, generic response to prevent email
enumeration) · **admin account lockdown** — admin role is unreachable
from public registration; the first admin is created via
`scripts/create_admin.py`, every admin after that via an existing
admin's **Manage Users** screen (`PATCH /api/users/{id}/role`) · notice
CRUD + personalized feed · faculty file upload → OCR → AI
category/summary/field extraction · faculty-post **approval workflow**
(pending until an admin approves/rejects; admin's own posts
auto-approve; notifications only fire on approval) · natural-language
search · bookmarks · notifications · AI assistant (retrieval-based) ·
events + a simple content-based recommender · placement portal · club
creation/joining · profile management (name/interests editable;
department/semester/SRN/Employee ID are roster-derived and read-only) ·
admin analytics + pending-approval queue · faculty per-notice reach/read
% analytics · **consistent loading/error/empty states** across every
page (each list view has a "try again" retry action on failure and a
specific empty-state message instead of a blank screen) ·
**mobile-responsive nav** (sidebar collapses into a slide-out drawer
under 860px) · **Terms & Privacy** page.

### Why a roster, not just an SRN text field

A free-text SRN field on its own doesn't verify anything — a fake SRN
still creates an account. The roster is what makes it real: an admin
pre-loads the actual list of enrolled SRNs (from the registrar's
records) *before* students ever register, so registration is checked
against something authoritative instead of trusted at face value. This
also solves the same problem for department/semester — those come from
the matched roster row, not from a dropdown the user picked.

**One deliberate placeholder, clearly marked in code:** password-reset
and email-verification links are returned directly in the API response
(`devToken` / `devResetPath` / `devVerifyPath`) instead of being emailed,
since no SMTP/email provider (SendGrid, SES, Postmark, etc.) is
configured. This keeps both flows fully testable end-to-end. Before a
real launch: wire an email provider in `routes/auth_routes.py` (the
`DEV_MODE_EXPOSE_TOKENS` env var already gates this — set it to `false`
once real email sending is in place, so tokens are never exposed over
the API).

**Stubbed or simplified, called out in code comments where relevant:**
- **Dark mode toggle** — tokens are already isolated in `global.css`
  custom properties, so a light-theme variable set + a toggle is a small
  addition, not currently built.
- **Charts** on the admin dashboard are plain numbers/tables; `recharts`
  is already a dependency if you want to visualize them.
- The recommendation engine is content-based (tag/department overlap),
  not collaborative filtering — there isn't "previously attended events"
  data to train on yet.
- No automated test suite (Phase 11) or CI/CD deploy pipeline (Phase 12)
  is included.

**Known gap to close before a real launch:** the registration form lets
anyone self-select the "admin" role. That's fine for local development
and demos, but before real students/faculty use this, lock admin
creation down — e.g. remove "admin" from the public register form and
promote users to admin manually in the database, or via an existing
admin's user-management screen.

**Not included at all (infrastructure you provide):**
A live MongoDB Atlas cluster, a Hugging Face model download/cache, and
deployment to Vercel/Render. All three are one-time setup steps outlined
below — the code is already written against them.

---

## Setup

### 1. MongoDB
Easiest for local dev: install MongoDB Community Server
(mongodb.com/try/download/community) and leave `MONGO_URI` as the
default `mongodb://localhost:27017` in `.env` — no account needed.
For a hosted option instead, create a free cluster at mongodb.com/atlas,
add a database user, allow your IP (or `0.0.0.0/0` for dev), and use
that connection string instead.

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env             # fill in MONGO_URI and JWT_SECRET
```
Tesseract OCR must also be installed on your system (not a pip package):
- macOS: `brew install tesseract`
- Ubuntu/Debian: `sudo apt install tesseract-ocr`
- Windows: installer at https://github.com/UB-Mannheim/tesseract/wiki

Run it:
```bash
uvicorn main:app --reload --port 8000
# Windows, if `uvicorn` isn't found on PATH: python -m uvicorn main:app --reload --port 8000
```
API docs (auto-generated by FastAPI) at `http://localhost:8000/docs`.

Create your first admin account (see [Creating the first admin](#creating-the-first-admin) above):
```bash
python scripts/create_admin.py
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env            # confirm VITE_API_URL points at your backend
npm run dev
```
Opens at `http://localhost:5173`.

### 4. Try it
1. Log in with the admin account you seeded. Go to **Enrollment
   Roster** and add one student (SRN `TEST001`, any department/semester)
   and one faculty member (Employee ID `FAC001`).
2. Register a **faculty** account using `FAC001`, upload a notice (any
   PDF/image with some text).
3. Back in the admin account, open the **Dashboard**'s "Pending
   approvals" section and approve the notice.
4. Register a **student** account using `TEST001` and the same
   department you gave it on the roster — you'll see the notice land in
   the feed and get a real-time notification, since approval just
   triggered the fan-out.

---

## Deployment (when you're ready)

- **Frontend → Vercel**: connect the repo, set root directory to
  `frontend`, add `VITE_API_URL` as an environment variable pointing at
  your Render backend URL.
- **Backend → Render**: new Web Service, root directory `backend`, build
  command `pip install -r requirements.txt`, start command
  `uvicorn main:app --host 0.0.0.0 --port $PORT`. Add all `.env` vars in
  Render's dashboard, and set `CORS_ORIGINS` to your Vercel URL.
- **Database**: already on Atlas from setup step 1.

---

## Folder structure

```
backend/
  routes/        one file per resource (auth, notices, events, ...)
  models/        Pydantic request/response schemas
  auth/          JWT + password hashing + role-guard dependencies
  ai/            OCR, summarizer, categorizer — pure functions, no FastAPI imports
  database/      Motor client + collection handles + index setup
  socket/        Socket.IO server + room-based notify helpers
  utils/         Mongo ObjectId <-> string helpers
  main.py        app assembly, CORS, router registration

frontend/src/
  pages/         one component per route
  components/    AppShell (sidebar/topbar), NoticeCard, PulseLine (brand motif)
  hooks/         useAuth (JWT session), useRealtimeNotifications (socket)
  services/      api.js — single fetch wrapper for the whole app
  styles/        global.css — all design tokens live here
```
