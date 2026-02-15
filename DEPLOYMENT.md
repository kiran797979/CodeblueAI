# 🚀 Deploy CodeBlue AI

You can deploy the **backend** and **frontend** together (Blueprint) or step-by-step. Free-tier options below.

---

## One-click deploy (Render Blueprint)

The repo includes a **render.yaml** Blueprint so Render can create both services from one flow.

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect **GitHub** and select the **CodeblueAI** repo (https://github.com/kiran797979/CodeblueAI).
3. Render will detect `render.yaml` and create two services:
   - **codeblue-api** (backend)
   - **codeblue-app** (frontend)
4. After the first deploy finishes, open the **codeblue-api** service and copy its URL (e.g. `https://codeblue-api.onrender.com`).
5. Open the **codeblue-app** service → **Environment** → add:
   - **Key:** `VITE_API_URL`
   - **Value:** your backend URL from step 4 (e.g. `https://codeblue-api.onrender.com`)
6. Click **Save Changes**; Render will redeploy the frontend. Once done, open the frontend URL — the app will work end-to-end.

**Note:** Free-tier backend may spin down after inactivity; the first request can take ~30 seconds.

---

## Option 1: Render (manual — free tier)

[Render](https://render.com) can host both backend and frontend. Connect your GitHub repo: https://github.com/kiran797979/CodeblueAI

### Step 1 — Deploy the backend

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect **GitHub** and select the **CodeblueAI** repo.
3. Settings:
   - **Name:** `codeblue-api` (or any name)
   - **Root Directory:** leave empty
   - **Runtime:** Node
   - **Build Command:** `npm run install:all`
   - **Start Command:** `node backend/server.js`
   - **Instance Type:** Free
4. Click **Create Web Service**.
5. Wait for deploy. Note the URL, e.g. `https://codeblue-api.onrender.com`.

### Step 2 — Deploy the frontend

1. **New** → **Static Site**.
2. Same repo: **CodeblueAI**.
3. Settings:
   - **Name:** `codeblue-app`
   - **Root Directory:** leave empty
   - **Build Command:** `npm run build:dashboard`
   - **Publish Directory:** `dashboard/dist`
   - **Environment:** Add variable:
     - **Key:** `VITE_API_URL`
     - **Value:** `https://codeblue-api.onrender.com` (your backend URL from Step 1)
4. Click **Create Static Site**.
5. After deploy, open the site URL. The app will call your deployed API.

**Note:** On Render free tier, the backend may spin down after inactivity; the first request can take ~30 seconds.

---

## Option 2: Vercel (frontend) + Render (backend)

- **Backend:** Deploy as in **Option 1, Step 1** on Render.
- **Frontend:** Deploy on [Vercel](https://vercel.com):
  1. Import repo **CodeblueAI**.
  2. **Root Directory:** `dashboard`.
  3. **Framework Preset:** Vite.
  4. **Build Command:** `npm run build` (default).
  5. **Output Directory:** `dist` (default).
  6. **Environment Variable:** `VITE_API_URL` = your Render backend URL (e.g. `https://codeblue-api.onrender.com`).
  7. Deploy.

---

## Option 3: Railway (backend + frontend)

1. Go to [Railway](https://railway.app) → **New Project** → **Deploy from GitHub** → select **CodeblueAI**.
2. **Backend:** Add a service; set **Root Directory** to repo root, **Build:** `npm run install:all`, **Start:** `node backend/server.js`. Add a public domain in Settings.
3. **Frontend:** Add another service; **Root Directory** = repo root, **Build:** `npm run build:dashboard`, **Output:** `dashboard/dist`; set env `VITE_API_URL` to the backend public URL. Use a static deploy or a small server to serve `dashboard/dist`.

---

## Environment variables

| Where        | Variable        | Description |
|-------------|-----------------|-------------|
| Backend     | `PORT`          | Set by Render/Railway (e.g. 10000). Omit locally (default 5000). |
| Frontend    | `VITE_API_URL`  | Backend API URL in production (e.g. `https://codeblue-api.onrender.com`). Omit locally (default `http://localhost:5000`). |

---

## After deployment

- **Backend health:** `https://your-backend-url/health`
- **Frontend:** Open your static site URL; use the form and confirm triage and hospital recommendations load.

If the frontend shows “Connection failed”, check that `VITE_API_URL` matches the backend URL and that CORS is enabled (it is in `backend/server.js`).
