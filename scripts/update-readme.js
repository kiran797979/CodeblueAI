#!/usr/bin/env node
/**
 * Auto-generates README.md from project sources.
 * Run: node scripts/update-readme.js   OR   npm run update-readme
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf8'));
  } catch {
    return null;
  }
}

function getRepoUrl() {
  const pkg = readJson('package.json');
  const url = pkg?.repository?.url || pkg?.repository;
  if (typeof url === 'string') return url.replace(/\.git$/, '');
  return 'https://github.com/kiran797979/CodeblueAI';
}

function getRepoName() {
  const url = getRepoUrl();
  const match = url.match(/\/([^/]+)\/?$/);
  return match ? match[1] : 'CodeblueAI';
}

function extractApiRoutes() {
  const serverPath = path.join(ROOT, 'backend', 'server.js');
  let content;
  try {
    content = fs.readFileSync(serverPath, 'utf8');
  } catch {
    return [];
  }
  const lines = content.split('\n');
  const routes = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/app\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/);
    if (!m) continue;
    const method = m[1].toUpperCase();
    const routePath = m[2];
    if (!routePath.startsWith('/')) continue;
    let description = inferDesc(method, routePath);
    const prev = lines[i - 1];
    if (prev) {
      const cm = prev.match(/\/\/\s*(GET|POST)\s+\S+\s*(.*)/);
      if (cm && cm[2]) description = cm[2].trim() || description;
    }
    routes.push({ method, path: routePath, description });
  }
  return routes;
}

function inferDesc(method, path) {
  const d = {
    '/health': 'System health and uptime',
    '/triage': 'Submit vitals → severity, priority, required specialty, ICU need, prep time',
    '/recommend-hospital': 'Body: `required_specialty`, `icu_needed` → top 3 ranked hospitals',
    '/hospitals': 'List all hospitals from `data/hospitals.json`',
    '/stats': 'Aggregate stats (total hospitals, ICU count, avg ER wait)',
  };
  return d[path] || '';
}

function getTechStack() {
  const root = readJson('package.json');
  const backend = readJson('backend/package.json');
  const dashboard = readJson('dashboard/package.json');
  const backDeps = { ...backend?.dependencies, ...backend?.devDependencies } || {};
  const dashDeps = { ...dashboard?.dependencies, ...dashboard?.devDependencies } || {};
  const rows = [
    ['Backend', 'Node.js + Express'],
    ['Frontend', 'React 18 + Vite'],
    ['Maps', 'React-Leaflet + Leaflet + OpenStreetMap'],
    ['HTTP', 'Axios'],
    ['Data', 'JSON (`data/hospitals.json`)'],
    ['Run', 'Concurrently (backend + dashboard)'],
  ];
  if (dashDeps.react) rows[1][1] = `React ${(dashDeps.react || '').replace(/^\^/, '')} + Vite`;
  return rows;
}

function getProjectStructure() {
  const repoName = getRepoName();
  return `\`\`\`
${repoName}/
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
\`\`\``;
}

function getPorts() {
  const serverPath = path.join(ROOT, 'backend', 'server.js');
  try {
    const content = fs.readFileSync(serverPath, 'utf8');
    const m = content.match(/PORT\s*=\s*(\d+)/);
    return { backend: m ? parseInt(m[1], 10) : 5000, frontend: 5173 };
  } catch {
    return { backend: 5000, frontend: 5173 };
  }
}

function getRootScripts() {
  const pkg = readJson('package.json');
  const scripts = pkg?.scripts || {};
  return scripts;
}

function generateReadme() {
  const repoUrl = getRepoUrl();
  const repoName = getRepoName();
  const cloneUrl = repoUrl + (repoUrl.endsWith('.git') ? '' : '.git');
  const routes = extractApiRoutes();
  const techStack = getTechStack();
  const ports = getPorts();
  const projectTree = getProjectStructure();

  const apiTable = routes.length
    ? routes
        .map(
          (r) => `| ${r.method} | \`${r.path}\` | ${r.description || '-'} |`
        )
        .join('\n')
    : `| GET | \`/health\` | System health and uptime |
| POST | \`/triage\` | Submit vitals → severity, priority, required specialty, ICU need, prep time |
| POST | \`/recommend-hospital\` | Body: \`required_specialty\`, \`icu_needed\` → top 3 ranked hospitals |
| GET | \`/hospitals\` | List all hospitals from \`data/hospitals.json\` |
| GET | \`/stats\` | Aggregate stats (total hospitals, ICU count, avg ER wait) |`;

  const techTable = techStack.map(([layer, tech]) => `| ${layer} | ${tech} |`).join('\n');

  return `# 🚑 CodeBlue AI
### Real-time Ambulance-to-Hospital Coordination System

> Built for hackathon. Designed to save lives.

**Repository:** [${repoUrl}](${repoUrl})

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
${techTable}

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ (v22+ recommended)
- **npm**

### Install & Run
\`\`\`bash
# Clone the repo
git clone ${cloneUrl}
cd ${repoName}

# Install all dependencies (root, backend, dashboard)
npm run install:all

# Start both backend and frontend
npm start
\`\`\`

### Access
- **Frontend (dashboard):** http://localhost:${ports.frontend}
- **Backend API:** http://localhost:${ports.backend}

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
${apiTable}

**Triage request body:** \`age\`, \`heartRate\`, \`bloodPressure\`, \`oxygen\`, \`traumaType\` (e.g. \`head_injury\`, \`cardiac_arrest\`, \`burns\`, \`fracture\`, \`respiratory\`, \`general\`).

---

## 📁 Project Structure
${projectTree}

---

## 🔄 Updating the README
To regenerate this README from the project (API routes, structure, repo URL, ports):

\`\`\`bash
npm run update-readme
\`\`\`

---

## 📜 License
MIT (or as specified for the hackathon).
`;
}

function main() {
  const readme = generateReadme();
  const outPath = path.join(ROOT, 'README.md');
  fs.writeFileSync(outPath, readme, 'utf8');
  console.log('README.md updated successfully.');
}

main();
