# NER-Sentinel Demo Script & Instructions for Hackathon Judges

## 1. Quick Start (Single Command Launch)
To boot the full system using Docker Compose:
```bash
cd infra
docker compose up --build
```
Access points:
- **Web GIS Dashboard**: `http://localhost:5173`
- **FastAPI Backend Swagger**: `http://localhost:8000/docs`
- **ML Risk Engine Swagger**: `http://localhost:8001/docs`

---

## 2. Running the End-to-End Scenario Simulation
To trigger an automated live rainfall spike scenario during a live demo or presentation:
```bash
python backend/scripts/simulate_scenario.py
```

### What Happens When You Run This Command:
1. **Rainfall Spike Injected**: 165mm cumulative rainfall and 96.5% soil moisture saturation are recorded for the **Cherrapunji (Sohra) Zone**.
2. **ML Risk Pipeline Executes**: The XGBoost model evaluates the spiked telemetry against terrain slope (38.5°) and historical landslide density.
3. **Risk Level Escalation**: Zone risk score escalates from baseline to **CRITICAL/SEVERE (0.88+)**.
4. **Automated Alert Cascade**: Multilingual notifications generated in **English, Assamese, Hindi, and Manipuri**.
5. **Mock SMS Broadcast**: Outgoing SMS messages logged and stored with simulated Twilio dispatch IDs.
6. **Live GIS Dashboard Animate**: Leaflet map polygon immediately turns red, road overlay updates to blocked, and toast notification pops up via WebSocket (`ws://localhost:8000/ws/live`).
