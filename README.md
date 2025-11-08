# Math Test Generator

Single-page React app (Vite) that talks to a lightweight Express proxy hosted separately. The proxy holds the Gemini API key so it never ships to the browser.

## Project layout

```
.
├── App.tsx                  # React UI
├── services/geminiService.ts # Frontend fetcher -> backend proxy
├── server/                  # Express proxy that calls Gemini
│   ├── index.js
│   ├── package.json
│   └── .env.example
└── .github/workflows/       # GitHub Pages deploy workflow
```

## Local development

1. **Backend**
   - `cp server/.env.example server/.env` and set `API_KEY`, `ALLOWED_ORIGINS` (add `http://localhost:5173` while developing).
   - `cd server && npm install` (first run only).
   - Start the proxy: `npm run dev`. The server listens on `http://localhost:4000` by default.

2. **Frontend**
   - `cp .env.example .env` and set `VITE_API_BASE_URL=http://localhost:4000` (or your Render URL).
   - From the repo root run `npm install` once, then `npm run dev` to start Vite on `http://localhost:3000`.
   - The frontend now proxies every request through the local Express server, so the browser never sees the Gemini API key.

## Deployment

### Backend on Render.com (secret lives here)

1. Commit/push this repo to GitHub (do **not** include `.env` files).
2. In Render, create **New → Web Service** and connect your repo.
3. Set **Root Directory** to `server`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Environment variables (Render Dashboard → Environment → Secrets):
   - `API_KEY` – your Gemini API key (this is never exposed to the frontend).
   - `ALLOWED_ORIGINS` – comma-separated list, e.g. `https://yourname.github.io,https://yourname.github.io/your-repo,http://localhost:5173` (Render strips the path but keeping both is harmless).
   - Optional: `GEMINI_MODEL`, `MAX_EXERCISES`, `PORT` (Render sets `PORT` automatically, so you can leave it blank).
7. Deploy. Render gives you a URL such as `https://math-test-api.onrender.com`. Use this in the next step as the frontend base URL.

### Frontend on GitHub Pages (static site)

GitHub Action `.github/workflows/deploy.yml` already builds and publishes `dist/` to Pages.

1. Push your repo to GitHub (again, without `.env`).
2. In the GitHub repo open `Settings → Pages` and set **Source** to "GitHub Actions" (only needs to be done once).
3. Add a repository **Actions variable** named `VITE_API_BASE_URL` (Settings → Secrets and variables → Actions → Variables) and set it to your Render URL (`https://math-test-api.onrender.com`).
4. Merge/push to `main`. The workflow will:
   - install deps,
   - run `npm run build` with the variable above,
   - upload `dist/` and publish it to Pages automatically.
5. Wait for the deployment URL (shown under the "Deploy to GitHub Pages" workflow run). Share that link with users.

### Ongoing updates

- Whenever you change frontend code, pushing to `main` will rebuild the static site automatically.
- When you rotate the Gemini API key, update it only in Render's `API_KEY` environment variable—no redeploy of the frontend is necessary.
- If you need to allow another origin (e.g., staging), append it to `ALLOWED_ORIGINS` in Render and redeploy the backend.

## Environment variables reference

| Location                     | Name                | Purpose |
|-----------------------------|---------------------|---------|
| `server/.env` (Render)      | `API_KEY`           | Gemini key – keep secret, never commit. |
|                             | `ALLOWED_ORIGINS`   | Origins allowed by CORS (GitHub Pages URL + local dev). |
|                             | `GEMINI_MODEL`      | Optional override (defaults to `gemini-2.5-pro`). |
|                             | `MAX_EXERCISES`     | Optional clamp for exercises (default `30`). |
| Frontend `.env` / GitHub var| `VITE_API_BASE_URL` | Base URL of the Render service; safe to share publicly. |
| Frontend `.env` (optional)  | `VITE_REQUEST_TIMEOUT_MS` | Override request timeout (default `120000`). |

## Useful commands

```bash
# Frontend
npm run dev       # Vite dev server
npm run build     # Production build

# Backend
cd server && npm run dev   # Hot-reload server locally
cd server && npm start     # Production-style run
```
