# Problem Statement Requirement Mapping Matrix

This document explicitly maps every functional requirement and expected solution from the problem statement to its exact implementing component, file path, and API endpoint in the **NER-Sentinel** repository.

---

## 1. Problem Statement Requirements Mapping

| # | Functional Requirement | Implementing File / Module | Key Endpoint / Functions |
|---|---|---|---|
| **a** | **Geospatial & Zone Risk Mapping** | [`backend/models.py`](file:///c:/Users/admin/Desktop/rakshak/backend/models.py)<br>[`web-dashboard/src/components/Map.tsx`](file:///c:/Users/admin/Desktop/rakshak/web-dashboard/src/components/Map.tsx) | `Zone` model with polygon geometry, Leaflet risk polygon heatmap styling (`getRiskColor`). |
| **b** | **Weather & IoT Telemetry Ingestion** | [`backend/ingestion/providers.py`](file:///c:/Users/admin/Desktop/rakshak/backend/ingestion/providers.py)<br>[`backend/ingestion/scheduler.py`](file:///c:/Users/admin/Desktop/rakshak/backend/ingestion/scheduler.py) | `IMDWeatherProvider`, `SensorNetworkProvider`, `SatelliteImageryProvider` background polling every 15m. |
| **c** | **ML Landslide Hazard Risk Engine** | [`ml-engine/train.py`](file:///c:/Users/admin/Desktop/rakshak/ml-engine/train.py)<br>[`ml-engine/predict.py`](file:///c:/Users/admin/Desktop/rakshak/ml-engine/predict.py) | `POST /predict` and `POST /batch-predict`, XGBoost classifier scoring (0-1), SHAP contributing risk factors. |
| **d** | **Multilingual Automated Alerts & SMS Gateway** | [`backend/alerts.py`](file:///c:/Users/admin/Desktop/rakshak/backend/alerts.py)<br>[`web-dashboard/src/components/AdminNotifications.tsx`](file:///c:/Users/admin/Desktop/rakshak/web-dashboard/src/components/AdminNotifications.tsx) | `create_multilingual_alerts()` in English, Assamese, Hindi, Manipuri; `MockSMSProvider` audit log UI. |
| **e** | **Field Officer & Citizen Geotagged Reporting** | [`backend/routers/reports.py`](file:///c:/Users/admin/Desktop/rakshak/backend/routers/reports.py)<br>[`mobile-app/App.tsx`](file:///c:/Users/admin/Desktop/rakshak/mobile-app/App.tsx) | `POST /api/reports` multipart photo upload, distance auto-matching, crowd-signal risk score boost logic. |
| **f** | **Road Network & Disaster Operations GIS** | [`backend/routers/api.py`](file:///c:/Users/admin/Desktop/rakshak/backend/routers/api.py)<br>[`web-dashboard/src/App.tsx`](file:///c:/Users/admin/Desktop/rakshak/web-dashboard/src/App.tsx) | `GET /api/roads`, `PATCH /api/roads/{id}/status`, road blockage overlays, Recharts 72h trend graphs. |
| **g** | **Offline-First Data Sync Pattern** | [`mobile-app/App.tsx`](file:///c:/Users/admin/Desktop/rakshak/mobile-app/App.tsx)<br>[`backend/routers/reports.py`](file:///c:/Users/admin/Desktop/rakshak/backend/routers/reports.py) | Local offline report queueing, background retry sync with `X-Idempotency-Key` deduplication. |

---

## 2. Expected Solutions Matrix

| Expected Solution | Code Implementation | Verification / Proof |
|---|---|---|
| **GIS Command Center Dashboard** | [`web-dashboard/src/App.tsx`](file:///c:/Users/admin/Desktop/rakshak/web-dashboard/src/App.tsx) | Dark command-center theme, Leaflet heatmap, KPI metrics bar, Recharts 72h telemetry graphs. |
| **Real-Time WebSocket Push** | [`backend/routers/websocket.py`](file:///c:/Users/admin/Desktop/rakshak/backend/routers/websocket.py) | Broadcasts live hazard escalation frames to connected dashboard clients (`ws://localhost:8000/ws/live`). |
| **Reproducible ML Pipeline** | [`ml-engine/train.py`](file:///c:/Users/admin/Desktop/rakshak/ml-engine/train.py) | 3,000 synthetic sample generator, RandomForest/XGBoost training script, model joblib export. |
| **Single-Command End-to-End Demo** | [`backend/scripts/simulate_scenario.py`](file:///c:/Users/admin/Desktop/rakshak/backend/scripts/simulate_scenario.py) | Executes rainfall spike, triggers ML pipeline, produces alerts, updates road status, pushes WS event. |
