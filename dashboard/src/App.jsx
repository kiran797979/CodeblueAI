import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import './App.css'

if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const TRAUMA_TYPES = [
  { value: 'head_injury', label: 'Head Injury' },
  { value: 'cardiac_arrest', label: 'Cardiac Arrest' },
  { value: 'burns', label: 'Burns' },
  { value: 'fracture', label: 'Fracture' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'general', label: 'General' },
]

const HOSPITAL_COORDS = {
  H001: [40.758, -73.9855],
  H002: [40.7282, -74.0776],
  H003: [40.7489, -73.968],
  H004: [40.7614, -73.9776],
  H005: [40.6892, -74.0445],
}

const SPECIALIST_MAP = {
  'Neuro Trauma': 'Dr. Rajesh Sharma',
  'Cardiac Surgery': 'Dr. Priya Patel',
  Burns: 'Dr. Ahmed Hassan',
  Orthopedics: 'Dr. Sarah Chen',
  Pulmonology: 'Dr. Michael Torres',
  'General Surgery': 'Dr. Lisa Wong',
}

const BP_PATTERN = /^\d{2,3}\/\d{2,3}$/

const initialForm = {
  age: '',
  heartRate: '',
  bloodPressure: '',
  oxygen: '',
  traumaType: 'head_injury',
  patientLat: '40.7128',
  patientLng: '-74.0060',
}

const initialErrors = {
  age: '',
  heartRate: '',
  bloodPressure: '',
  oxygen: '',
}

function ETATimer({ secondsLeft, etaSeconds, topHospital, arrived }) {
  const mm = Math.floor(secondsLeft / 60)
  const ss = secondsLeft % 60
  const display = arrived ? 'ARRIVED' : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  const distanceKm = topHospital?.distance_km ?? 0

  return (
    <div className="card card-eta">
      <div className="eta-row1">🚑 AMBULANCE DISPATCHED</div>
      <div className={`eta-timer ${arrived ? 'eta-arrived' : ''}`}>{display}</div>
      <div className="eta-row3">{arrived ? 'Patient arrived safely' : 'counting down'}</div>
      <div className="eta-divider" />
      <div className="eta-footer-grid">
        <div>
          <div className="eta-label">TO</div>
          <div className="eta-value">{topHospital?.name ?? '—'}</div>
        </div>
        <div>
          <div className="eta-label">DISTANCE</div>
          <div className="eta-value">{distanceKm} km</div>
        </div>
      </div>
    </div>
  )
}

function SurvivalCard({ animated }) {
  return (
    <div className="card card-survival">
      <div className="survival-header">
        <span className="survival-title">❤️ SURVIVAL IMPACT</span>
        <span className="survival-badge">+23% SURVIVAL RATE</span>
      </div>
      <div className="survival-divider" />
      <div className="survival-row">
        <div className="survival-row-label">Without CodeBlue AI</div>
        <div className="survival-bar-wrap">
          <div className="survival-bar-container survival-bar-red">
            <div
              className="survival-bar-fill survival-fill-red"
              style={{ width: animated ? '85%' : '0%' }}
            />
          </div>
          <span className="survival-time survival-time-red data-font">11 min</span>
        </div>
      </div>
      <div className="survival-gap" />
      <div className="survival-row">
        <div className="survival-row-label survival-label-bold">With CodeBlue AI</div>
        <div className="survival-bar-wrap">
          <div className="survival-bar-container survival-bar-green">
            <div
              className="survival-bar-fill survival-fill-green"
              style={{ width: animated ? '27%' : '0%' }}
            />
          </div>
          <span className="survival-time survival-time-green data-font">3 min</span>
        </div>
      </div>
      <div className="survival-stats">
        <span className="survival-stat survival-stat-blue">⚡ 8 min saved</span>
        <span className="survival-stat survival-stat-green">🚀 67% faster</span>
        <span className="survival-stat survival-stat-pink">❤️ +23% survival</span>
      </div>
    </div>
  )
}

function PreArrivalCard({ hospitalName, requiredSpecialty, icuRoom, notifiedMinutes, specialistMap }) {
  const doctor = specialistMap[requiredSpecialty] ?? 'Dr. On Call'
  return (
    <div className="card card-alert">
      <div className="alert-header">🏥 PRE-ARRIVAL ALERT SENT</div>
      <div className="alert-hospital">{hospitalName}</div>
      <div className="alert-divider" />
      <div className="alert-checklist">
        <div className="alert-item">✅ ICU [Room {icuRoom}] — RESERVED</div>
        <div className="alert-item">✅ {doctor} — NOTIFIED</div>
        <div className="alert-item">✅ Blood type O-negative — PREPPED</div>
        <div className="alert-item alert-item-last">✅ Surgical team — ON STANDBY</div>
      </div>
      <div className="alert-footer">🕐 Hospital notified {notifiedMinutes} min ago</div>
    </div>
  )
}

function DispatchMap({ patientPos, hospitalPos, hospitalName, ambPos, polylinePositions }) {
  const ambulanceIcon = L.divIcon({
    className: 'ambulance-icon',
    html: '<div class="amb-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
  const hospitalIcon = L.divIcon({
    className: 'hospital-icon',
    html: '<div class="hosp-dot">🏥</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
  const center = [
    (patientPos[0] + hospitalPos[0]) / 2,
    (patientPos[1] + hospitalPos[1]) / 2,
  ]

  return (
    <div className="card card-map">
      <h3 className="card-title map-card-title">🗺️ LIVE DISPATCH MAP</h3>
      <div className="map-container">
        <MapContainer center={center} zoom={13} className="leaflet-map" scrollWheelZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={hospitalPos} icon={hospitalIcon}>
            <Popup>{hospitalName}</Popup>
          </Marker>
          {ambPos && (
            <Marker position={ambPos} icon={ambulanceIcon} />
          )}
          <Polyline positions={polylinePositions} color="#1a56db" weight={3} dashArray="8 6" opacity={0.7} />
        </MapContainer>
      </div>
    </div>
  )
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState(initialErrors)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [triage, setTriage] = useState(null)
  const [hospitals, setHospitals] = useState(null)
  const [timestamp, setTimestamp] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [ambPos, setAmbPos] = useState(null)
  const [notifiedMinutes, setNotifiedMinutes] = useState(0)
  const [survivalAnimated, setSurvivalAnimated] = useState(false)
  const ambIntervalRef = useRef(null)
  const timerIntervalRef = useRef(null)

  const icuRoom = useMemo(() => Math.floor(Math.random() * 3) + 1, [triage])

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validate = useCallback(() => {
    const newErrors = { ...initialErrors }
    let valid = true

    const ageNum = Number(form.age)
    if (form.age === '' || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      newErrors.age = 'Age must be between 1 and 120'
      valid = false
    }

    const hrNum = Number(form.heartRate)
    if (form.heartRate === '' || isNaN(hrNum) || hrNum < 20 || hrNum > 300) {
      newErrors.heartRate = 'Heart Rate must be between 20 and 300'
      valid = false
    }

    const oxNum = Number(form.oxygen)
    if (form.oxygen === '' || isNaN(oxNum) || oxNum < 50 || oxNum > 100) {
      newErrors.oxygen = 'Oxygen must be between 50 and 100'
      valid = false
    }

    if (!form.bloodPressure.trim() || !BP_PATTERN.test(form.bloodPressure.trim())) {
      newErrors.bloodPressure = 'Blood Pressure must match format: 120/80'
      valid = false
    }

    setErrors(newErrors)
    return valid
  }, [form])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      if (!validate()) return

      setError(null)
      setLoading(true)
      setTriage(null)
      setHospitals(null)
      setTimestamp(null)
      setSecondsLeft(0)
      setAmbPos(null)
      setNotifiedMinutes(0)
      setSurvivalAnimated(false)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (ambIntervalRef.current) clearInterval(ambIntervalRef.current)

      const triagePayload = {
        age: Number(form.age),
        heartRate: Number(form.heartRate),
        bloodPressure: form.bloodPressure.trim(),
        oxygen: Number(form.oxygen),
        traumaType: form.traumaType,
      }

      try {
        const triageRes = await axios.post(`${API_BASE}/triage`, triagePayload)
        const triageData = triageRes.data

        const hospitalPayload = {
          severity: triageData.severity,
          priority_level: triageData.priority_level,
          required_specialty: triageData.required_specialty,
          icu_needed: triageData.icu_needed,
        }

        const hospitalRes = await axios.post(
          `${API_BASE}/recommend-hospital`,
          hospitalPayload
        )

        setTriage(triageData)
        setHospitals(hospitalRes.data)
        setTimestamp(new Date().toLocaleString())

        const first = hospitalRes.data.recommended_hospitals?.[0]
        if (first) {
          const etaSec = Math.round((first.distance_km / 40) * 3600)
          setSecondsLeft(etaSec)
        }

        setTimeout(() => setSurvivalAnimated(true), 100)

        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setTimeout(() => {
            document.getElementById('results-panel')?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          (err.code === 'ERR_NETWORK' || err.message === 'Network Error'
            ? 'Connection failed. Ensure backend is running on port 5000.'
            : err.message || 'Request failed.')
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [form, validate]
  )

  const hasResults = triage && hospitals
  const topHospital = hospitals?.recommended_hospitals?.[0]
  const etaSeconds = topHospital ? Math.round((topHospital.distance_km / 40) * 3600) : 0
  const arrived = secondsLeft <= 0 && etaSeconds > 0

  useEffect(() => {
    if (!hasResults || etaSeconds <= 0 || secondsLeft <= 0) return
    timerIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [hasResults, etaSeconds])

  useEffect(() => {
    if (!hasResults) return
    setNotifiedMinutes(0)
    const n = setInterval(() => setNotifiedMinutes((m) => m + 1), 60000)
    return () => clearInterval(n)
  }, [hasResults])

  const patientLat = Number(form.patientLat) || 40.7128
  const patientLng = Number(form.patientLng) || -74.006
  const patientPos = [patientLat, patientLng]
  const hospitalPos = topHospital && HOSPITAL_COORDS[topHospital.id] ? HOSPITAL_COORDS[topHospital.id] : patientPos

  useEffect(() => {
    if (!hasResults || !topHospital || !HOSPITAL_COORDS[topHospital.id]) return
    const startTime = Date.now()
    setAmbPos(patientPos)
    const hosPos = HOSPITAL_COORDS[topHospital.id]
    ambIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / etaSeconds, 1)
      const newLat = patientLat + (hosPos[0] - patientLat) * progress
      const newLng = patientLng + (hosPos[1] - patientLng) * progress
      setAmbPos([newLat, newLng])
      if (progress >= 1 && ambIntervalRef.current) clearInterval(ambIntervalRef.current)
    }, 1000)
    return () => {
      if (ambIntervalRef.current) clearInterval(ambIntervalRef.current)
    }
  }, [hasResults, topHospital?.id, patientLat, patientLng, etaSeconds])

  const priority = triage?.priority_level?.toLowerCase()
  const priorityBadgeClass =
    priority === 'red'
      ? 'badge badge-red'
      : priority === 'orange'
        ? 'badge badge-orange'
        : 'badge badge-green'

  const polylinePositions = topHospital && HOSPITAL_COORDS[topHospital.id] ? [patientPos, HOSPITAL_COORDS[topHospital.id]] : []

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <span className="pulse-dot" />
            <span className="brand-text">CODEBLUE AI</span>
          </div>
          <div className="live-indicator">
            <span className="live-dot" />
            <span>LIVE SYSTEM</span>
          </div>
        </div>
        <p className="tagline">Real-time Emergency Coordination Platform</p>
      </header>

      <div className="layout">
        <aside className="form-panel">
          <form onSubmit={handleSubmit} className="form">
            <label>
              Age
              <input
                type="number"
                min={1}
                max={120}
                value={form.age}
                onChange={(e) => updateForm('age', e.target.value)}
                placeholder="e.g. 45"
                required
              />
              {errors.age && <span className="field-error">{errors.age}</span>}
            </label>

            <label>
              Heart Rate bpm
              <input
                type="number"
                min={20}
                max={300}
                value={form.heartRate}
                onChange={(e) => updateForm('heartRate', e.target.value)}
                placeholder="e.g. 110"
                required
              />
              {errors.heartRate && (
                <span className="field-error">{errors.heartRate}</span>
              )}
            </label>

            <label>
              Blood Pressure
              <input
                type="text"
                value={form.bloodPressure}
                onChange={(e) => updateForm('bloodPressure', e.target.value)}
                placeholder="120/80"
                required
              />
              {errors.bloodPressure && (
                <span className="field-error">{errors.bloodPressure}</span>
              )}
            </label>

            <label>
              Oxygen Level %
              <input
                type="number"
                min={50}
                max={100}
                value={form.oxygen}
                onChange={(e) => updateForm('oxygen', e.target.value)}
                placeholder="e.g. 94"
                required
              />
              {errors.oxygen && (
                <span className="field-error">{errors.oxygen}</span>
              )}
            </label>

            <label>
              Trauma Type
              <select
                value={form.traumaType}
                onChange={(e) => updateForm('traumaType', e.target.value)}
              >
                {TRAUMA_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Patient Latitude
              <input
                type="number"
                step="any"
                value={form.patientLat}
                onChange={(e) => updateForm('patientLat', e.target.value)}
              />
            </label>

            <label>
              Patient Longitude
              <input
                type="number"
                step="any"
                value={form.patientLng}
                onChange={(e) => updateForm('patientLng', e.target.value)}
              />
            </label>

            <button type="submit" className="btn-dispatch" disabled={loading}>
              DISPATCH ANALYSIS
            </button>
          </form>
        </aside>

        <main id="results-panel" className="results-panel">
          {loading && (
            <div className="loading-message">
              <span className="loading-pulse">Analyzing patient data...</span>
            </div>
          )}

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          {hasResults && !loading && (
            <>
              <ETATimer
                secondsLeft={secondsLeft}
                etaSeconds={etaSeconds}
                topHospital={topHospital}
                arrived={arrived}
              />
              <SurvivalCard animated={survivalAnimated} />
              <div
                className={`card card-triage ${
                  priority === 'red' ? 'triage-critical' : priority === 'orange' ? 'triage-serious' : 'triage-stable'
                }`}
              >
                <h3 className="card-title">TRIAGE ASSESSMENT</h3>
                <div className="triage-grid">
                  <div>
                    <span className="triage-label">Patient Status</span>
                    <span className="triage-value">{triage.severity}</span>
                  </div>
                  <div>
                    <span className="triage-label">Priority</span>
                    <span className={priorityBadgeClass}>{triage.priority_level}</span>
                  </div>
                  <div>
                    <span className="triage-label">Required Specialty</span>
                    <span className="triage-value">{triage.required_specialty}</span>
                  </div>
                  <div>
                    <span className="triage-label">ICU Required</span>
                    <span className={triage.icu_needed ? 'icu-yes' : 'icu-no'}>
                      {triage.icu_needed ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div>
                    <span className="triage-label">Timestamp</span>
                    <span className="triage-value data-font">{timestamp}</span>
                  </div>
                </div>
              </div>

              <PreArrivalCard
                hospitalName={topHospital?.name}
                requiredSpecialty={triage.required_specialty}
                icuRoom={icuRoom}
                notifiedMinutes={notifiedMinutes}
                specialistMap={SPECIALIST_MAP}
              />

              <div className="card card-hospitals">
                <h3 className="card-title">HOSPITAL RECOMMENDATIONS</h3>
                <p className="card-subtitle">Ranked by compatibility score</p>
                <div className="hospital-list">
                  {hospitals.recommended_hospitals?.map((h) => (
                    <div
                      key={h.id}
                      className={`hospital-card ${h.rank === 1 ? 'hospital-rank-1' : ''}`}
                    >
                      <div
                        className={`rank-badge ${h.rank === 1 ? 'rank-1' : 'rank-other'}`}
                      >
                        #{h.rank}
                      </div>
                      <h4 className="hospital-name">{h.name}</h4>
                      <p className="hospital-score data-font">SCORE: {h.score}</p>
                      <div className="stat-pills">
                        <span className="stat-pill">📍 {h.distance_km} km</span>
                        <span className="stat-pill">🛏 {h.icu_beds_available} ICU beds</span>
                        <span className="stat-pill">⏱ {h.er_wait_time_minutes} min wait</span>
                        <span className="stat-pill">🏥 Level {h.trauma_center_level}</span>
                      </div>
                      <p className="hospital-reason">{h.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <DispatchMap
                patientPos={patientPos}
                hospitalPos={hospitalPos}
                hospitalName={topHospital?.name}
                ambPos={ambPos}
                polylinePositions={polylinePositions}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
