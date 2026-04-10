# ProLaunch Careers CV Optimizer

**AI-powered career tools built for job seekers.**

ProLaunch Careers helps users land jobs faster with instant CV analysis, ATS-optimized resume rewrites, tailored cover letters, interview preparation, and personalized career insights.

🔗 **Live app:** https://prolaunch-cv-optimizer.vercel.app

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Overview

ProLaunch Careers operates on a freemium model. Users get one free CV analysis on sign-up, and can unlock the full premium suite for ₦1,000 via a 24-hour access window. The platform is serverless-first — the frontend is plain HTML/CSS/JavaScript, and all backend logic runs as Node.js serverless functions deployed on Vercel.

User data (registrations, premium payments) is stored in Google Sheets via a Google Apps Script webhook, making the platform lightweight and low-cost to run.

---

## Features

### Free
| Feature | Description |
|---|---|
| **CV Analyzer** | Uploads and parses a CV (PDF, DOCX, DOC, TXT), scores it against the user's target role, and returns structured feedback on strengths, weaknesses, and ATS compatibility |

### Premium (₦1,000 / 24-hour access)
| Feature | Description |
|---|---|
| **Resume Builder** | Full ATS-optimized resume rewrite tailored to a specific job description |
| **Cover Letter** | Job-specific cover letter that maps the user's experience to the role |
| **Interview Prep** | 10 AI-generated interview questions with model answers for the specific role |
| **Career Insights** | Salary benchmarks, in-demand skills list, and a personalized 90-day action plan |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                              │
│   index.html → dashboard → cv-analyzer → cv-optimizer       │
│   cover-letter → interview-prep → career-insights           │
│                                                              │
│   Session state: localStorage (user profile + premium flag) │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
          ┌──────────────▼──────────────────┐
          │     Vercel Serverless Functions  │
          │         (Node.js ESM)            │
          │                                  │
          │  POST /api/generate              │
          │  POST /api/parse-cv              │
          │  POST /api/save-sheet            │
          │  POST /api/lookup-user           │
          └────┬──────────────┬─────────────┘
               │              │
     ┌─────────▼──┐    ┌──────▼──────────────┐
     │ Google     │    │ Google Sheets        │
     │ Gemini API │    │ (via Apps Script     │
     │ (AI calls) │    │  webhook)            │
     └────────────┘    └─────────────────────┘
```

### Data Flow — New User Registration
1. User fills in name, email, target role, experience level, and uploads CV on `index.html`
2. CV file is sent to `/api/parse-cv` → returns extracted plain text
3. User profile + CV text is saved to `localStorage`
4. User data (name, email, role, level) is sent to `/api/save-sheet` → forwarded to Google Apps Script → written to Google Sheets
5. User is redirected to the CV Analyzer page

### Data Flow — Returning User
1. User enters email on `index.html`
2. Frontend calls `/api/lookup-user` → Apps Script queries Google Sheets by email
3. If found, user profile and premium status are restored to `localStorage`
4. User is redirected to the dashboard

### Data Flow — AI Feature Request
1. Frontend builds a structured prompt using the user's CV text, job role, and (where applicable) job description
2. Prompt is sent to `/api/generate`
3. `/api/generate` forwards the prompt to Google Gemini 2.5 Flash
4. AI response is returned to the frontend and rendered in the UI
5. Output can be downloaded as a `.doc` file

### Premium Access Flow
1. User is redirected to Selar (Nigerian payment gateway) with their email prefilled
2. After payment, Selar redirects back to the app with a callback
3. `/api/save-sheet` is called with `action: savePremium` and a Unix timestamp
4. Timestamp is stored in `localStorage` and synced to Google Sheets
5. All premium pages check `isPremium()` — access expires 24 hours from the payment timestamp

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Backend | Node.js 18+, Vercel Serverless Functions |
| AI | Google Gemini 2.5 Flash (`gemini-2.5-flash`) |
| Database | Google Sheets + Google Apps Script (webhook) |
| Payments | Selar (Nigerian payment gateway) |
| File Parsing | `pdf-parse` (PDF), `mammoth` (DOCX/DOC), native fs (TXT) |
| File Uploads | `formidable` (multipart form handling) |
| Hosting | Vercel |

---

## Project Structure

```
prolaunch-cv-optimizer/
│
├── api/                        # Vercel Serverless Functions (Node.js)
│   ├── generate.js             # AI proxy → Google Gemini API
│   ├── parse-cv.js             # CV file upload handler + text extraction
│   ├── save-sheet/
│   │   └── index.js            # Forwards user data to Google Apps Script
│   └── lookup-user/
│       └── index.js            # Looks up returning users from Google Sheets
│
├── pages/                      # App pages (all require session)
│   ├── dashboard.html          # User dashboard + feature menu
│   ├── cv-analyzer.html        # Free CV analysis tool
│   ├── cv-optimizer.html       # Premium: ATS resume rewriter
│   ├── cover-letter.html       # Premium: cover letter generator
│   ├── interview-prep.html     # Premium: interview Q&A generator
│   ├── career-insights.html    # Premium: salary + skills + action plan
│   └── unlock.html             # Premium paywall / Selar redirect
│
├── shared.js                   # Shared utility library (PL namespace)
│   │                           # Handles: session, premium check, AI calls,
│   │                           # Sheets sync, toast notifications, doc downloads
│
├── index.html                  # Landing page + registration / session restore
├── logo2.png                   # Brand logo
├── package.json                # Node.js dependencies
└── vercel.json                 # Vercel deployment config
```

---

## API Reference

All API routes are serverless functions deployed under `/api/`.

---

### `POST /api/parse-cv`

Accepts a CV file upload and returns extracted plain text.

**Content-Type:** `multipart/form-data`

**Form field:** `cv` — the file to upload (PDF, DOCX, DOC, or TXT, max 5MB)

**Response (200):**
```json
{
  "text": "Extracted CV text content...",
  "filename": "my-cv.pdf"
}
```

**Response (422):**
```json
{
  "error": "The file was parsed but no text could be extracted. It may be a scanned image PDF."
}
```

**Supported formats:** `.pdf`, `.docx`, `.doc`, `.txt`

---

### `POST /api/generate`

Proxies a prompt to Google Gemini and returns the AI-generated response.

**Content-Type:** `application/json`

**Request body:**
```json
{
  "prompt": "Analyze this CV for a Software Engineer role: ..."
}
```

**Response (200):**
```json
{
  "text": "AI-generated response text..."
}
```

**Notes:** This endpoint keeps the Google API key server-side and never exposes it to the browser. All AI calls from the frontend go through this proxy.

---

### `POST /api/save-sheet`

Forwards user data to the Google Apps Script webhook, which writes it to Google Sheets.

**Content-Type:** `application/json`

**Request body (new registration):**
```json
{
  "action": "save",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "Product Manager",
  "level": "Mid-Level (3–5 years)"
}
```

**Request body (premium payment):**
```json
{
  "action": "savePremium",
  "email": "jane@example.com",
  "paidAt": "1712345678901"
}
```

**Response (200):**
```json
{ "success": true }
```

---

### `POST /api/lookup-user`

Looks up a returning user by email from Google Sheets and returns their profile and premium status.

**Content-Type:** `application/json`

**Request body:**
```json
{
  "email": "jane@example.com"
}
```

**Response (200 — user found):**
```json
{
  "found": true,
  "user": {
    "fname": "Jane",
    "lname": "Doe",
    "email": "jane@example.com",
    "role": "Product Manager",
    "level": "Mid-Level (3–5 years)",
    "joinedAt": "1712345678901"
  },
  "premium": {
    "active": true,
    "timestamp": 1712345678901,
    "timeLeft": "18h 32m"
  }
}
```

**Response (200 — user not found):**
```json
{ "found": false }
```

---

## Environment Variables

The following environment variables must be set in your Vercel project (or `.env` for local dev):

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | ✅ Yes | Google Gemini API key — used by `/api/generate` |
| `GOOGLE_SCRIPT_URL` | ✅ Yes | Google Apps Script deployment URL — used by `/api/save-sheet` and `/api/lookup-user` |

> ⚠️ Never commit these values to version control. Add `.env` to your `.gitignore`.

---

## Local Development

### Prerequisites
- Node.js 18 or higher
- Vercel CLI (`npm install -g vercel`)
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))
- A deployed Google Apps Script URL (connected to your Google Sheet)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/prolaunch-cv-optimizer.git
cd prolaunch-cv-optimizer

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
# Fill in GOOGLE_API_KEY and GOOGLE_SCRIPT_URL

# 4. Start the local development server
vercel dev
```

The app will be available at `http://localhost:3000`.

The Vercel CLI handles routing for serverless functions locally, so all `/api/*` routes work the same as in production.

---

## Deployment

This project is deployed to Vercel.

### Deploy via Vercel CLI

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Deploy via GitHub Integration

1. Push the repository to GitHub
2. Import the project at Vercel
3. Add your environment variables in the Vercel dashboard under **Settings → Environment Variables**
4. Every push to `main` will trigger an automatic production deployment

---

## Roadmap

- [ ] **Docker support** — containerize the app for self-hosting and local dev without Vercel CLI
- [ ] **CI/CD pipeline** — GitHub Actions workflow for automated testing and deployment
- [ ] **Monitoring** — Prometheus + Grafana dashboard for API response times, uptime, and error rates
- [ ] **Structured logging** — replace `console.log` with a proper logging library (e.g., Pino)
- [ ] **Rate limiting** — protect `/api/generate` from abuse
- [ ] **LinkedIn PDF support** — parse LinkedIn-exported CVs (currently limited by image-based PDF format)
- [ ] **Download PDF Format** — export optimized CVs in PDF (currently limited plain text format)
- [ ] **Extended premium tiers** — weekly and monthly access options

---

Built by [Mary-Queen Uchechukwu](https://github.com/Kweenshaly7) for ProLaunch Careers.
