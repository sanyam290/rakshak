# NER AI Early Warning & Landslide Monitoring Platform
### Step-by-Step Build Plan + Ready-to-Use Antigravity Prompts

This document breaks the problem statement into a buildable MVP architecture and gives you **copy-paste prompts** for each development phase in Antigravity (Google's agentic IDE). Feed them in order — each assumes the previous phase's code already exists in the workspace.

---

## 1. Scope Decision (read this first)

The full problem statement (live sensors, satellite feeds, IMD integration, SMS gateways, offline sync) is a multi-team production system. For a hackathon/prototype build, pick a **realistic MVP slice** that still demonstrates every required capability using simulated/mock data where live integrations aren't feasible in the timeframe. The prompts below build:

- A working GIS dashboard with risk heatmap
- A mock/simulated ML risk-prediction engine (trained on synthetic or public landslide datasets)
- A citizen/field-officer reporting app (photo + geotag upload)
- An alerts engine (in-app + simulated SMS)
- A multilingual notification layer
- An offline-first sync pattern

Where a real API (IMD, satellite) isn't accessible, the prompts explicitly ask for a **mock data service with the same interface**, so it's a drop-in swap later — mention this clearly in your hackathon pitch/demo as "integration-ready."

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend web dashboard | React + Vite + Tailwind + Mapbox GL / Leaflet | Fast to build, great GIS support |
| Mobile field app | React Native (Expo) or PWA | One codebase, works low-network |
| Backend API | Node.js (Express) or Python (FastAPI) | FastAPI pairs well with ML model serving |
| ML engine | Python (scikit-learn / XGBoost) served via FastAPI | Simple, explainable risk scoring |
| Database | PostgreSQL + PostGIS | Geospatial queries for zones/roads |
| Realtime/alerts | WebSockets (Socket.IO) + Twilio (mock in dev) | Live dashboard push + SMS simulation |
| File/photo storage | Local disk or S3-compatible bucket (MinIO for local dev) | Geo-tagged uploads |
| Offline sync | IndexedDB (web) / SQLite (mobile) + background sync queue | Works in low-connectivity zones |
| Deployment | Docker Compose (dev), Kubernetes-ready structure | Scalable later |

---

## 3. High-Level Architecture

```
[Citizen/Field App] --(geo photo, report)--> [API Gateway] --> [PostgreSQL+PostGIS]
[Sensor/Weather Mock Feed] --(rainfall, soil, terrain)--> [Data Ingestion Service] --> [ML Risk Engine]
[ML Risk Engine] --(risk score per zone)--> [Alerts Service] --> [SMS/App/Multilingual Notify]
[GIS Dashboard] <--(WebSocket live updates)-- [API Gateway]
```

---

## 4. Step-by-Step Antigravity Prompts

Run these **in order**, one at a time, letting Antigravity finish and verify each step before moving to the next.

---

### Step 0 — Project Scaffolding

```
Create a monorepo for a disaster-management platform called "NER-Sentinel" with this structure:
- /backend  (FastAPI, Python 3.11, PostgreSQL+PostGIS via SQLAlchemy + GeoAlchemy2)
- /ml-engine (Python service for landslide risk prediction, served via FastAPI, separate from main backend)
- /web-dashboard (React + Vite + TypeScript + TailwindCSS + Leaflet)
- /mobile-app (React Native with Expo, TypeScript)
- /infra (docker-compose.yml wiring postgres/postgis, backend, ml-engine, web-dashboard)
- /docs (architecture.md, api-spec.md)

Set up docker-compose so `docker compose up` starts Postgres+PostGIS, backend, and ml-engine together with hot reload. Add .env.example files for each service. Do not implement business logic yet — just scaffolding, health-check endpoints, and a working docker-compose that boots cleanly.
```

---

### Step 1 — Database Schema (Core Domain Model)

```
In /backend, using SQLAlchemy + GeoAlchemy2 against PostgreSQL/PostGIS, create models and Alembic migrations for:

1. Zone (id, name, district, state, geometry: Polygon, terrain_slope_deg, soil_type, historical_landslide_count)
2. SensorReading (id, zone_id FK, timestamp, rainfall_mm, soil_moisture_pct, source: enum[sensor, satellite, manual])
3. RiskAssessment (id, zone_id FK, timestamp, risk_score float 0-1, risk_level enum[low, moderate, high, severe], model_version)
4. FieldReport (id, reporter_name, reporter_type enum[citizen, field_officer], zone_id FK nullable, latitude, longitude, description, photo_url, video_url, status enum[pending, verified, dismissed], created_at)
5. Road (id, name, geometry: LineString, zone_id FK, connectivity_status enum[open, restricted, blocked], last_updated)
6. Alert (id, zone_id FK, risk_assessment_id FK, severity, message, language, channel enum[app, sms], sent_at, acknowledged boolean)

Add seed data: 8-10 realistic zones across Assam, Meghalaya, Mizoram, and Manipur districts with approximate real polygon coordinates, plus 30 days of synthetic SensorReading history per zone with rainfall/soil patterns that spike before 2-3 simulated landslide events.
```

---

### Step 2 — Mock External Data Feeds (IMD / Satellite / Sensors)

```
In /backend, create a "data-ingestion" module with three mock provider services that mimic real integrations but return realistic synthetic data:

1. IMDWeatherProvider — get_forecast(zone_id) returns rainfall forecast (mm, next 72h in 3h buckets), matching the shape of IMD's public API response format (research and match their actual JSON structure/field names where possible).
2. SatelliteImageryProvider — get_latest_imagery(zone_id) returns a mock NDVI/slope-change score and a placeholder image URL.
3. SensorNetworkProvider — get_latest_readings(zone_id) returns current soil moisture and rainfall from the SensorReading table, simulating IoT sensor polling.

Each provider must be behind an interface (Python Protocol/ABC) so a real provider can be swapped in later without changing calling code. Add a scheduled background job (APScheduler) that polls all three every 15 minutes (configurable) and writes new SensorReading rows, feeding the ML engine pipeline in Step 3.
```

---

### Step 3 — ML Risk Prediction Engine

```
In /ml-engine, build a FastAPI service exposing POST /predict that accepts {zone_id, rainfall_mm_24h, rainfall_mm_72h, soil_moisture_pct, slope_deg, historical_landslide_count, satellite_change_score} and returns {risk_score: 0-1, risk_level, contributing_factors: [...]}.

1. Generate a synthetic but realistic training dataset (at least 2000 rows) combining rainfall intensity, soil saturation, slope angle, and historical incident density, with landslide/no-landslide labels following known geotechnical risk heuristics (e.g., risk rises sharply above 100mm/24h rainfall on slopes >30 degrees with saturated soil).
2. Train an XGBoost or RandomForest classifier, save it with joblib, and include a training script (train.py) so it's reproducible.
3. Implement SHAP or feature-importance based "contributing_factors" so each prediction returns a human-readable explanation like "Heavy 24h rainfall (120mm) on a 34° slope with high soil saturation".
4. Add a /batch-predict endpoint that scores all zones at once — this is what the backend's scheduler will call every 15 minutes to refresh RiskAssessment rows.

Include a README explaining this is trained on synthetic data for prototype purposes and lists what real datasets (e.g., Bhukosh/GSI landslide inventory, IMD historical rainfall) should replace it in production.
```

---

### Step 4 — Backend: Risk Pipeline + Alerts Engine

```
In /backend, wire together:

1. A scheduled job (every 15 min) that, for each Zone: pulls latest data via the Step 2 providers, calls ml-engine's /predict, stores a new RiskAssessment row, and — if risk_level moves to "high" or "severe" (or increases by 2+ levels since last check) — creates Alert rows.
2. An Alerts service that, per Alert, generates messages in English, Assamese, Hindi, and one more regional language of your choice (use simple template strings, not live translation, to keep costs at zero — but structure it so a translation API can be swapped in later), then "sends" via:
   - WebSocket broadcast to connected dashboard clients (channel="app")
   - A mock SMS provider (channel="sms") that just logs/stores the outgoing message (simulate Twilio's interface: send_sms(to, body) — implement as a stub you can swap for real Twilio later)
3. REST endpoints: GET /zones, GET /zones/{id}/risk-history, GET /alerts?zone_id=, POST /alerts/{id}/acknowledge, GET /roads, PATCH /roads/{id}/status.
4. A WebSocket endpoint /ws/live that pushes new RiskAssessment and Alert events to subscribed dashboard clients in real time.

Write integration tests simulating a rainfall spike causing a risk escalation and confirming an Alert is generated and broadcast.
```

---

### Step 5 — Field Reporting API (Citizen/Officer Uploads)

```
In /backend, add:

1. POST /reports — accepts multipart form data (photo/video file, latitude, longitude, description, reporter_type, reporter_name optional). Store files locally under /uploads (or MinIO if configured) and save a FieldReport row with status="pending".
2. Auto-match each report to the nearest Zone using PostGIS ST_Distance against zone geometries, and bump that zone's risk score slightly (small weighted boost) if multiple pending reports cluster in the same area within 24h — implement this as a simple "crowd-signal boost" function.
3. GET /reports?status=&zone_id= for dashboard review, and PATCH /reports/{id} to let officials mark verified/dismissed.
4. Make the upload endpoint resilient to poor connectivity: accept chunked/resumable uploads OR, simpler, accept a client-generated idempotency key so retried uploads from spotty networks don't create duplicates.
```

---

### Step 6 — Web GIS Dashboard

```
In /web-dashboard, using React + TypeScript + TailwindCSS + Leaflet (with a light/dark map style), build:

1. Main dashboard layout: left sidebar (zone list with risk badges), center map, right panel (selected zone detail).
2. Map layers (toggleable): risk heatmap (color zones by current risk_level: green/yellow/orange/red), road connectivity overlay (green=open, orange=restricted, red=blocked, drawn as colored lines), field report pins (clustered, click to view photo/description).
3. Top KPI bar: total zones, zones at high/severe risk, blocked roads count, unacknowledged alerts count.
4. Live updates via WebSocket connection to /ws/live — new risk changes should animate the affected zone and show a toast notification.
5. Alerts panel: list of alerts with severity color, timestamp, acknowledge button (calls the backend endpoint).
6. A "Risk Forecast" chart (use Recharts) per selected zone showing rainfall + risk_score trend over the last 72 hours pulled from GET /zones/{id}/risk-history.
7. Language switcher (English / Hindi / Assamese) that swaps UI strings using a simple i18n JSON dictionary (react-i18next).

Use the frontend-design principles for a clean, high-contrast, data-dense but uncluttered emergency-ops aesthetic (think command-center dashboard, not a marketing site).
```

---

### Step 7 — Mobile / Field App (Reporting + Offline)

```
In /mobile-app (React Native + Expo, TypeScript), build a simple field-reporting app:

1. Home screen: current device location, nearest zone risk level badge, "Report an Issue" button.
2. Report screen: camera/gallery photo capture, auto-attach GPS coordinates, description text field, submit button.
3. Offline-first behavior: if network is unavailable, queue the report in local SQLite (expo-sqlite) with status="queued", show it in a "Pending Sync" list, and auto-retry submission via a background task when connectivity returns (use NetInfo to detect reconnection).
4. Alerts screen: list of active alerts for the user's current zone, pulled from GET /alerts, with pull-to-refresh; cache last-fetched alerts locally so they're viewable offline.
5. Multi-language toggle (same i18n dictionary approach as the web dashboard, keep them in a shared /shared-i18n folder if convenient).

Keep the UI minimal and large-tap-target friendly — this app should work for field officials on old Android phones with poor connectivity, not power users.
```

---

### Step 8 — Multilingual Notification Content + SMS Simulation UI

```
Add a small admin screen in /web-dashboard (route: /admin/notifications) showing a live log of all Alert messages generated, filterable by language and channel, so judges/demo viewers can see the multilingual SMS simulation working (e.g., "SMS sent to +91XXXXXXXXXX in Assamese: [message]"). Pull this from GET /alerts and display the pre-generated language variants for each alert.
```

---

### Step 9 — Demo Data & Scenario Script

```
Create a /docs/demo-script.md and a backend script /backend/scripts/simulate_scenario.py that, when run, injects a realistic rainfall spike into one zone's SensorReading data over a simulated 6-hour window, triggers the risk pipeline to recompute, and produces a visible cascade: risk_level rises → Alert generated → WebSocket push → dashboard updates live → mock SMS logged. This should be a single command that produces an end-to-end live demo for judges without manual data entry.
```

---

### Step 10 — Polish & Docs

```
1. Write /docs/architecture.md summarizing the system with a simple text/mermaid diagram of data flow (sensors/weather → ML engine → alerts → dashboard/mobile).
2. Write /README.md at repo root: problem statement summary, architecture diagram, tech stack, how to run locally (docker compose up), demo script instructions, and a clearly labeled "Production Roadmap" section listing what needs to be swapped from mock to real (IMD API, satellite feed provider, Twilio SMS, sensor telemetry ingestion, translation API, cloud deployment/K8s).
3. Add a one-page PROBLEM_STATEMENT_MAPPING.md that maps each requirement from the original SIH problem statement (a–f, and each "Expected Solution" bullet) to the specific component/file that implements it — this is critical for judging/evaluation clarity.
```

---

## 5. Order of Operations Summary

1. Scaffold repo & docker-compose
2. DB schema + seed data
3. Mock IMD/satellite/sensor providers
4. ML risk engine (train + serve)
5. Backend risk pipeline + alerts
6. Field report API
7. Web GIS dashboard
8. Mobile field app
9. Notification simulation view
10. Demo script + docs/mapping

## 6. Tips for the Antigravity Session

- Run one prompt at a time and let it fully complete + verify (build passes, docker boots) before pasting the next.
- If Antigravity's output drifts from the stack choices above, add a short correction prompt rather than starting over.
- Keep the `PROBLEM_STATEMENT_MAPPING.md` (Step 10.3) updated as you go — it's the single most useful artifact for a hackathon judge skimming quickly.
- Before your final demo, run the Step 9 scenario script twice to confirm it's reliable — live demos should never depend on manual clicking through real weather.
