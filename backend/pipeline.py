import os
import logging
from datetime import datetime, timedelta
import httpx
from sqlalchemy.orm import Session
import models
from alerts import create_multilingual_alerts

logger = logging.getLogger("risk_pipeline")
ML_ENGINE_URL = os.getenv("ML_ENGINE_URL", "http://localhost:8001")

def evaluate_zone_risk(zone: models.Zone, db: Session, ws_manager=None) -> models.RiskAssessment:
    """
    Evaluates landside risk for a single zone by aggregating recent sensor telemetry
    and querying the ML risk engine service.
    """
    now = datetime.utcnow()
    t24 = now - timedelta(hours=24)
    t72 = now - timedelta(hours=72)

    # 1. Query sensor readings in 24h and 72h windows
    readings_24h = db.query(models.SensorReading).filter(
        models.SensorReading.zone_id == zone.id,
        models.SensorReading.timestamp >= t24
    ).all()

    readings_72h = db.query(models.SensorReading).filter(
        models.SensorReading.zone_id == zone.id,
        models.SensorReading.timestamp >= t72
    ).all()

    rainfall_24h = sum(r.rainfall_mm for r in readings_24h) if readings_24h else 25.0
    rainfall_72h = sum(r.rainfall_mm for r in readings_72h) if readings_72h else 60.0

    latest_reading = db.query(models.SensorReading).filter(
        models.SensorReading.zone_id == zone.id
    ).order_by(models.SensorReading.timestamp.desc()).first()

    soil_moisture = latest_reading.soil_moisture_pct if latest_reading else 50.0

    payload = {
        "zone_id": zone.id,
        "rainfall_mm_24h": round(rainfall_24h, 1),
        "rainfall_mm_72h": round(rainfall_72h, 1),
        "soil_moisture_pct": round(soil_moisture, 1),
        "slope_deg": zone.terrain_slope_deg,
        "historical_landslide_count": zone.historical_landslide_count,
        "satellite_change_score": 0.15
    }

    # 2. Call ML Engine microservice or use fallback logic
    risk_score = 0.2
    risk_level_str = "low"
    factors = ["Normal telemetry conditions"]

    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.post(f"{ML_ENGINE_URL}/predict", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                risk_score = data["risk_score"]
                risk_level_str = data["risk_level"]
                factors = data["contributing_factors"]
            else:
                logger.warning(f"ML Engine returned status {resp.status_code}. Using fallback prediction.")
    except Exception as e:
        logger.info(f"ML Engine HTTP unreachable ({e}). Using embedded fallback risk prediction.")
        # Embedded fallback risk formula
        base_score = min(0.99, (rainfall_24h / 140.0) * 0.45 + (soil_moisture / 100.0) * 0.30 + (zone.terrain_slope_deg / 50.0) * 0.25)
        risk_score = round(base_score, 2)
        if risk_score >= 0.75:
            risk_level_str = "severe"
            factors = [f"Heavy 24h rainfall ({rainfall_24h:.1f}mm)", f"High soil saturation ({soil_moisture:.1f}%)"]
        elif risk_score >= 0.55:
            risk_level_str = "high"
            factors = [f"Sustained rainfall surge ({rainfall_24h:.1f}mm)"]
        elif risk_score >= 0.35:
            risk_level_str = "moderate"
            factors = [f"Moderate soil saturation ({soil_moisture:.1f}%)"]

    risk_level_enum = models.RiskLevelEnum(risk_level_str)

    # 3. Fetch previous assessment to check for escalation
    previous_assessment = db.query(models.RiskAssessment).filter(
        models.RiskAssessment.zone_id == zone.id
    ).order_by(models.RiskAssessment.timestamp.desc()).first()

    # 4. Save new RiskAssessment
    new_assessment = models.RiskAssessment(
        zone_id=zone.id,
        timestamp=now,
        risk_score=risk_score,
        risk_level=risk_level_enum,
        contributing_factors=factors,
        model_version="v1.0-xgboost"
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    # 5. Check if escalation occurs or risk is High/Severe
    is_escalation = False
    if previous_assessment:
        old_level = previous_assessment.risk_level.value
        if risk_level_str in ["high", "severe"] and old_level in ["low", "moderate"]:
            is_escalation = True
    elif risk_level_str in ["high", "severe"]:
        is_escalation = True

    if is_escalation:
        logger.info(f"Risk escalation detected for Zone '{zone.name}' -> Level: {risk_level_str}. Generating Alerts.")
        create_multilingual_alerts(db, zone, new_assessment, ws_manager)

    return new_assessment

def run_full_pipeline(db: Session, ws_manager=None):
    """
    Evaluates risk for all zones in the database.
    """
    zones = db.query(models.Zone).all()
    results = []
    for zone in zones:
        res = evaluate_zone_risk(zone, db, ws_manager)
        results.append(res)
    return results
