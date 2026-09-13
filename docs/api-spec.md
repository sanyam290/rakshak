# NER-Sentinel REST & WebSocket API Specification

## Base URLs
- Backend API: `http://localhost:8000`
- ML Engine API: `http://localhost:8001`
- WebSocket Live Feed: `ws://localhost:8000/ws/live`

## Backend Endpoints

### 1. Health Check
`GET /health`
Response: `{"status": "ok", "service": "backend"}`

### 2. Zones API
- `GET /zones`: Fetch list of all monitoring zones with geometries and current risk scores.
- `GET /zones/{id}`: Fetch detailed zone profile.
- `GET /zones/{id}/risk-history`: Fetch 72-hour rainfall and risk score history.

### 3. Risk Predictions & Assessments
- `POST /pipeline/evaluate`: Manually trigger evaluation pipeline for all zones.

### 4. Alerts API
- `GET /alerts?zone_id=&severity=`: Fetch generated alerts.
- `POST /alerts/{id}/acknowledge`: Mark an alert as acknowledged by emergency response team.

### 5. Roads API
- `GET /roads`: Fetch road network lines and connectivity status (`open`, `restricted`, `blocked`).
- `PATCH /roads/{id}/status`: Update connectivity status of a road segment.

### 6. Field Reports API
- `POST /reports`: Multipart form submission for citizen/field officer reports (photo, lat, lng, description, reporter_type).
- `GET /reports?status=&zone_id=`: List field reports.
- `PATCH /reports/{id}`: Update report verification status (`pending`, `verified`, `dismissed`).

### 7. WebSocket Interface
- `ws://localhost:8000/ws/live`: Broadcasts real-time events (`risk_update`, `new_alert`, `road_status_change`).

---

## ML Engine Endpoints

### 1. Single Risk Prediction
`POST /predict`
Payload:
```json
{
  "zone_id": 1,
  "rainfall_mm_24h": 120.5,
  "rainfall_mm_72h": 210.0,
  "soil_moisture_pct": 82.4,
  "slope_deg": 34.2,
  "historical_landslide_count": 5,
  "satellite_change_score": 0.15
}
```
Response:
```json
{
  "risk_score": 0.88,
  "risk_level": "severe",
  "contributing_factors": [
    "Heavy 24h rainfall (120.5mm) on 34.2° steep slope",
    "High soil moisture saturation (82.4%)"
  ]
}
```

### 2. Batch Prediction
`POST /batch-predict`
Payload: Array of zone feature payloads.
Response: Array of prediction objects.
