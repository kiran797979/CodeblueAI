# 🚑 CodeBlue AI
### Real-time Ambulance-to-Hospital Coordination System

> Built for hackathon. Designed to save lives.

**Repository:** [https://github.com/kiran797979/CodeblueAI](https://github.com/kiran797979/CodeblueAI)

---

## 🎯 Problem
When an ambulance rushes to the nearest hospital, that hospital may have no ICU beds, no matching specialist, and zero preparation time. The result: chaos, delays, and preventable deaths.

## 💡 Solution
CodeBlue AI triages the patient in real-time, ranks hospitals by specialty match + ICU availability + distance, and pre-alerts the best hospital **before** the ambulance arrives.

---

## ✨ Features
- 🧠 **Real-time AI triage** — Severity score from vitals (age, heart rate, blood pressure, oxygen, trauma type) with Red/Orange/Green priority
- 🏥 **Smart hospital ranking** — Top 3 hospitals by specialty match, ICU beds, distance, ER wait, and trauma level
- ⏱ **Live ETA countdown** — Countdown timer to arrival at the recommended hospital
- 🗺️ **Live dispatch map** — React-Leaflet map with patient location, hospital marker, and animated ambulance route
- 📋 **Pre-arrival alert** — Simulated alert to hospital (ICU room, specialist, blood prep, surgical standby)
- ❤️ **Survival impact** — Visualization of time saved and survival rate improvement (e.g. +23%, 8 min saved)
- 📱 **Responsive** — Mobile and desktop friendly

---

## 🛠️ Tech Stack
| Layer   | Technology                    |
|--------|-------------------------------|
| Backend | Node.js + Express |
| Frontend | React 18.3.1 + Vite |
| Maps | React-Leaflet + Leaflet + OpenStreetMap |
| HTTP | Axios |
| Data | JSON (`data/hospitals.json`) |
| Run | Concurrently (backend + dashboard) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ (v22+ recommended)
- **npm**

### Install & Run
```bash
# Clone the repo
git clone https://github.com/kiran797979/CodeblueAI.git
cd CodeblueAI

# Install all dependencies (root, backend, dashboard)
npm run install:all

# Start both backend and frontend
npm start
```

### Access
- **Frontend (dashboard):** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health and uptime |
| POST | `/triage` | Submit vitals → severity, priority, required specialty, ICU need, prep time |
| POST | `/recommend-hospital` | Body: `required_specialty`, `icu_needed` → top 3 ranked hospitals |
| GET | `/hospitals` | List all hospitals from `data/hospitals.json` |
| GET | `/stats` | Aggregate stats (total hospitals, ICU count, avg ER wait) |

**Triage request body:** `age`, `heartRate`, `bloodPressure`, `oxygen`, `traumaType` (e.g. `head_injury`, `cardiac_arrest`, `burns`, `fracture`, `respiratory`, `general`).

---

## 📁 Project Structure
```
CodeblueAI/
├── package.json          # Root: install:all, start (concurrently)
├── README.md
├── backend/
│   ├── package.json      # express, cors, nodemon
│   └── server.js         # API routes + triage + hospital ranking
├── dashboard/            # React + Vite app
│   ├── package.json      # react, vite, axios, leaflet, react-leaflet
│   ├── index.html
│   └── src/
│       ├── App.jsx       # Main UI: form, triage, ETA, map, pre-arrival, survival
│       └── App.css
├── data/
│   └── hospitals.json    # Hospital list (id, name, distance_km, specialties, etc.)
└── scripts/
    └── update-readme.js  # Auto-generate this README
```

---

## 🌐 Deploy

The app is ready to deploy: backend uses `PORT` from the environment; the frontend uses `VITE_API_URL` for the API base URL.

**One-click:** Use [Render Blueprint](https://dashboard.render.com/blueprints) — connect this repo and Render creates both backend and frontend from **render.yaml**. Set `VITE_API_URL` on the frontend to your backend URL. See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full steps and other options (Vercel, Railway).

---

## 🔄 Updating the README
To regenerate this README from the project (API routes, structure, repo URL, ports):

```bash
npm run update-readme
```

---

## 📜 License
MIT (or as specified for the hackathon).
