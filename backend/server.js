// 1. All requires at top
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 2. App setup
const app = express();
const PORT = 5000;

// 3. Load hospitals safely with try/catch
let hospitals = [];
try {
  const hospitalsPath = path.join(__dirname, '..', 'data', 'hospitals.json');
  const raw = fs.readFileSync(hospitalsPath, 'utf8');
  hospitals = JSON.parse(raw);
  console.log(`Loaded ${hospitals.length} hospitals`);
} catch (err) {
  console.error('Failed to load hospitals.json:', err.message);
  console.error('Expected path:', path.join(__dirname, '..', 'data', 'hospitals.json'));
  process.exit(1);
}

// 4. Middleware
app.use(cors());
app.use(express.json());

// 5. All routes here

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'CodeBlue AI',
    version: '1.0.0',
    uptime: process.uptime() + ' seconds',
  });
});

// POST /triage
app.post('/triage', (req, res) => {
  const { age = 0, heartRate = 0, bloodPressure = '', oxygen = 0, traumaType = 'general' } = req.body;

  let score = 0;

  // heartRate
  if (heartRate < 50 || heartRate > 150) score += 3;
  else if ((heartRate >= 50 && heartRate <= 60) || (heartRate >= 120 && heartRate <= 150)) score += 1;

  // oxygen
  if (oxygen < 85) score += 3;
  else if (oxygen >= 85 && oxygen < 92) score += 2;
  else if (oxygen >= 92 && oxygen < 95) score += 1;

  // age
  if (age > 70 || age < 5) score += 1;

  // traumaType
  if (traumaType === 'cardiac_arrest') score += 4;
  else if (traumaType === 'head_injury') score += 3;
  else if (traumaType === 'burns' || traumaType === 'respiratory') score += 2;
  else score += 1;

  // bloodPressure
  const systolic = parseInt(String(bloodPressure).split('/')[0], 10) || 0;
  if (systolic > 180 || systolic < 70) score += 3;
  else if (systolic >= 140 && systolic <= 180) score += 1;
  else if (systolic >= 70 && systolic <= 90) score += 1;

  // Severity
  let severity, priority_level;
  if (score >= 8) {
    severity = 'Critical';
    priority_level = 'Red';
  } else if (score >= 4 && score <= 7) {
    severity = 'Serious';
    priority_level = 'Orange';
  } else {
    severity = 'Stable';
    priority_level = 'Green';
  }

  const specialtyMap = {
    head_injury: 'Neuro Trauma',
    cardiac_arrest: 'Cardiac Surgery',
    burns: 'Burns',
    fracture: 'Orthopedics',
    respiratory: 'Pulmonology',
    general: 'General Surgery',
  };
  const required_specialty = specialtyMap[traumaType] || 'General Surgery';
  const icu_needed = score >= 6;

  const prepMap = { Critical: 5, Serious: 10, Stable: 20 };
  const estimated_prep_time_minutes = prepMap[severity];

  const notes =
    severity === 'Critical'
      ? `Critical patient. ${required_specialty} consult required. Immediate intervention needed.`
      : severity === 'Serious'
        ? `Serious condition. ${required_specialty} evaluation recommended. Monitor closely.`
        : `Stable condition. ${required_specialty} assessment when available.`;

  res.json({
    severity,
    priority_level,
    required_specialty,
    icu_needed,
    triage_score: score,
    estimated_prep_time_minutes,
    notes,
    timestamp: new Date().toISOString(),
  });
});

// POST /recommend-hospital
app.post('/recommend-hospital', (req, res) => {
  const { required_specialty, icu_needed } = req.body;

  const scored = hospitals.map((h) => {
    let score = 0;
    const reasons = [];

    if (h.specialties.includes(required_specialty)) {
      score += 50;
      reasons.push('Specialty match');
    }
    if (icu_needed) {
      if (h.icu_beds_available > 0) {
        score += 30;
        reasons.push('ICU available');
      } else {
        score -= 50;
        reasons.push('No ICU beds');
      }
    }
    if (h.distance_km < 3) {
      score += 20;
      reasons.push('Close proximity');
    } else if (h.distance_km <= 6) {
      score += 10;
      reasons.push('Moderate distance');
    }
    if (h.er_wait_time_minutes < 10) {
      score += 10;
      reasons.push('Short ER wait');
    } else if (h.er_wait_time_minutes <= 20) {
      score += 5;
      reasons.push('Moderate ER wait');
    }
    if (h.trauma_center_level === 1) {
      score += 15;
      reasons.push('Level 1 trauma');
    } else if (h.trauma_center_level === 2) {
      score += 8;
      reasons.push('Level 2 trauma');
    }

    const reason = reasons.length > 0 ? reasons.join(' + ') : 'Limited match for criteria';
    return { ...h, score, reason };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3).map((h, i) => ({
    rank: i + 1,
    score: h.score,
    id: h.id,
    name: h.name,
    distance_km: h.distance_km,
    icu_beds_available: h.icu_beds_available,
    er_wait_time_minutes: h.er_wait_time_minutes,
    trauma_center_level: h.trauma_center_level,
    specialties: h.specialties,
    reason: h.reason,
  }));

  res.json({
    recommended_hospitals: top3,
    total_hospitals_evaluated: hospitals.length,
  });
});

// GET /hospitals
app.get('/hospitals', (req, res) => {
  res.json({ hospitals, total: hospitals.length });
});

// GET /stats
app.get('/stats', (req, res) => {
  const hospitals_with_icu = hospitals.filter((h) => h.icu_beds_available > 0).length;
  const avgWait = hospitals.reduce((sum, h) => sum + h.er_wait_time_minutes, 0) / hospitals.length;
  res.json({
    total_hospitals: hospitals.length,
    hospitals_with_icu,
    average_er_wait: Math.round(avgWait * 10) / 10,
    system_status: 'Operational',
    timestamp: new Date().toISOString(),
  });
});

// 6. 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 7. Error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 8. app.listen() — MUST BE LAST
app.listen(PORT, () => {
  console.log(`CodeBlue AI backend running on http://localhost:${PORT}`);
});
