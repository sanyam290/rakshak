from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from pipeline import evaluate_zone_risk, run_full_pipeline

router = APIRouter()

# Pydantic Schemas
class RoadStatusUpdate(BaseModel):
    connectivity_status: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class TestSMSRequest(BaseModel):
    zone_id: Optional[int] = 1
    phone_number: str = "+919876543210"
    message: str = "EMERGENCY HAZARD WARNING: Heavy rainfall surge. Evacuate low-lying slope areas."
    language: str = "en"
    severity: str = "severe"

@router.post("/admin/login")
def admin_login(req: AdminLoginRequest):
    if req.username.strip().lower() in ["admin", "sdma_admin"] and req.password.strip() in ["admin123", "password123", "admin"]:
        return {
            "status": "success",
            "token": "admin-session-token-998822",
            "admin_name": "Senior SDMA Officer",
            "role": "disaster_management_admin"
        }
    raise HTTPException(status_code=401, detail="Invalid admin credentials. Use username: admin / password: admin123")

@router.post("/alerts/send-test-sms")
def send_test_sms(req: TestSMSRequest, db: Session = Depends(get_db)):
    from alerts import sms_provider
    from routers.websocket import ws_manager
    import asyncio

    zone = db.query(models.Zone).filter(models.Zone.id == req.zone_id).first() if req.zone_id else None
    zone_id_val = zone.id if zone else 1
    severity_enum = models.RiskLevelEnum(req.severity) if req.severity in ["low", "moderate", "high", "severe"] else models.RiskLevelEnum.severe

    # Save App Channel Alert
    alert_app = models.Alert(
        zone_id=zone_id_val,
        severity=severity_enum,
        message=req.message,
        language=req.language,
        channel=models.ChannelEnum.app,
        sent_at=datetime.utcnow(),
        acknowledged=False
    )
    db.add(alert_app)

    # Save SMS Channel Alert
    alert_sms = models.Alert(
        zone_id=zone_id_val,
        severity=severity_enum,
        message=req.message,
        language=req.language,
        channel=models.ChannelEnum.sms,
        sent_at=datetime.utcnow(),
        acknowledged=False
    )
    db.add(alert_sms)
    db.commit()

    # Dispatch SMS
    sms_res = sms_provider.send_sms(req.phone_number, req.message, req.language)

    # Broadcast WebSocket notification
    try:
        asyncio.run(ws_manager.broadcast({
            "type": "new_alert",
            "zone_id": zone_id_val,
            "zone_name": zone.name if zone else "Emergency Zone",
            "severity": req.severity,
            "message": req.message
        }))
    except Exception as e:
        pass

    return {
        "status": "success",
        "alert_id": alert_sms.id,
        "recipient_phone": req.phone_number,
        "sms_dispatch": sms_res
    }

# Endpoints

@router.get("/zones")
def get_all_zones(db: Session = Depends(get_db)):
    zones = db.query(models.Zone).all()
    results = []
    for zone in zones:
        latest_risk = db.query(models.RiskAssessment).filter(
            models.RiskAssessment.zone_id == zone.id
        ).order_by(models.RiskAssessment.timestamp.desc()).first()

        latest_reading = db.query(models.SensorReading).filter(
            models.SensorReading.zone_id == zone.id
        ).order_by(models.SensorReading.timestamp.desc()).first()

        results.append({
            "id": zone.id,
            "name": zone.name,
            "district": zone.district,
            "state": zone.state,
            "terrain_slope_deg": zone.terrain_slope_deg,
            "soil_type": zone.soil_type,
            "historical_landslide_count": zone.historical_landslide_count,
            "geometry_json": zone.geometry_json,
            "current_risk_score": latest_risk.risk_score if latest_risk else 0.1,
            "current_risk_level": latest_risk.risk_level.value if latest_risk else "low",
            "contributing_factors": latest_risk.contributing_factors if latest_risk else [],
            "latest_rainfall_mm": latest_reading.rainfall_mm if latest_reading else 0.0,
            "latest_soil_moisture_pct": latest_reading.soil_moisture_pct if latest_reading else 0.0
        })
    return results

@router.get("/zones/{zone_id}")
def get_zone_detail(zone_id: int, db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    latest_risk = db.query(models.RiskAssessment).filter(
        models.RiskAssessment.zone_id == zone.id
    ).order_by(models.RiskAssessment.timestamp.desc()).first()

    return {
        "id": zone.id,
        "name": zone.name,
        "district": zone.district,
        "state": zone.state,
        "terrain_slope_deg": zone.terrain_slope_deg,
        "soil_type": zone.soil_type,
        "historical_landslide_count": zone.historical_landslide_count,
        "geometry_json": zone.geometry_json,
        "current_risk_score": latest_risk.risk_score if latest_risk else 0.1,
        "current_risk_level": latest_risk.risk_level.value if latest_risk else "low",
        "contributing_factors": latest_risk.contributing_factors if latest_risk else []
    }

@router.get("/zones/{zone_id}/risk-history")
def get_zone_risk_history(zone_id: int, db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    since = datetime.utcnow() - timedelta(hours=72)
    
    readings = db.query(models.SensorReading).filter(
        models.SensorReading.zone_id == zone_id,
        models.SensorReading.timestamp >= since
    ).order_by(models.SensorReading.timestamp.asc()).all()

    assessments = db.query(models.RiskAssessment).filter(
        models.RiskAssessment.zone_id == zone_id,
        models.RiskAssessment.timestamp >= since
    ).order_by(models.RiskAssessment.timestamp.asc()).all()

    history = []
    for r in readings:
        matching_risk = next((a for a in assessments if abs((a.timestamp - r.timestamp).total_seconds()) < 10800), None)
        history.append({
            "timestamp": r.timestamp.isoformat(),
            "rainfall_mm": r.rainfall_mm,
            "soil_moisture_pct": r.soil_moisture_pct,
            "risk_score": matching_risk.risk_score if matching_risk else round(min(0.95, (r.rainfall_mm / 150.0) * 0.7), 2)
        })
    
    return {
        "zone_id": zone_id,
        "zone_name": zone.name,
        "history": history
    }

@router.get("/alerts")
def get_alerts(
    zone_id: Optional[int] = None,
    severity: Optional[str] = None,
    channel: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Alert)
    if zone_id:
        query = query.filter(models.Alert.zone_id == zone_id)
    if severity:
        query = query.filter(models.Alert.severity == models.RiskLevelEnum(severity))
    if channel:
        query = query.filter(models.Alert.channel == models.ChannelEnum(channel))

    alerts = query.order_by(models.Alert.sent_at.desc()).limit(100).all()
    results = []
    for a in alerts:
        zone = db.query(models.Zone).filter(models.Zone.id == a.zone_id).first()
        results.append({
            "id": a.id,
            "zone_id": a.zone_id,
            "zone_name": zone.name if zone else "Unknown Zone",
            "district": zone.district if zone else "",
            "severity": a.severity.value,
            "message": a.message,
            "language": a.language,
            "channel": a.channel.value,
            "sent_at": a.sent_at.isoformat(),
            "acknowledged": a.acknowledged
        })
    return results

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.acknowledged = True
    db.commit()
    return {"status": "success", "alert_id": alert_id, "acknowledged": True}

@router.delete("/alerts")
def clear_all_alerts(db: Session = Depends(get_db)):
    count = db.query(models.Alert).delete()
    db.commit()
    return {"status": "success", "deleted_count": count}

@router.get("/roads")
def get_roads(db: Session = Depends(get_db)):
    roads = db.query(models.Road).all()
    results = []
    for r in roads:
        zone = db.query(models.Zone).filter(models.Zone.id == r.zone_id).first()
        results.append({
            "id": r.id,
            "name": r.name,
            "zone_id": r.zone_id,
            "zone_name": zone.name if zone else "",
            "geometry_json": r.geometry_json,
            "connectivity_status": r.connectivity_status.value,
            "last_updated": r.last_updated.isoformat()
        })
    return results

@router.patch("/roads/{road_id}/status")
def update_road_status(road_id: int, status_update: RoadStatusUpdate, db: Session = Depends(get_db)):
    road = db.query(models.Road).filter(models.Road.id == road_id).first()
    if not road:
        raise HTTPException(status_code=404, detail="Road segment not found")

    try:
        new_status = models.RoadStatusEnum(status_update.connectivity_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value. Must be 'open', 'restricted', or 'blocked'.")

    road.connectivity_status = new_status
    road.last_updated = datetime.utcnow()
    db.commit()
    return {
        "status": "success",
        "road_id": road_id,
        "new_connectivity_status": road.connectivity_status.value
    }

@router.post("/pipeline/evaluate")
def trigger_evaluation_pipeline(db: Session = Depends(get_db)):
    results = run_full_pipeline(db)
    return {
        "status": "success",
        "evaluated_zones_count": len(results),
        "timestamp": datetime.utcnow().isoformat()
    }
