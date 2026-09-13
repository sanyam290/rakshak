import os
import uuid
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models

router = APIRouter()

# In-memory idempotency cache for network retries
PROCESSED_IDEMPOTENCY_KEYS = {}

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Approximate Euclidean distance in degrees for fast spatial matching."""
    return ((lat1 - lat2)**2 + (lon1 - lon2)**2)**0.5

def find_nearest_zone(latitude: float, longitude: float, db: Session) -> Optional[models.Zone]:
    zones = db.query(models.Zone).all()
    min_dist = float('inf')
    best_zone = None

    for zone in zones:
        coords = zone.geometry_json
        if not coords or len(coords) == 0:
            continue
        # Centroid of polygon
        avg_lon = sum(c[0] for c in coords) / len(coords)
        avg_lat = sum(c[1] for c in coords) / len(coords)
        
        dist = calculate_distance(latitude, longitude, avg_lat, avg_lon)
        if dist < min_dist:
            min_dist = dist
            best_zone = zone

    # Return zone if within ~50km radius (~0.45 deg)
    return best_zone if min_dist < 0.5 else None

def apply_crowd_signal_risk_boost(zone: models.Zone, db: Session):
    """
    If 3+ field reports cluster in the same zone within 24 hours,
    apply a small weighted boost (+0.12) to the zone's current risk assessment.
    """
    cutoff = datetime.utcnow() - timedelta(hours=24)
    recent_reports_count = db.query(models.FieldReport).filter(
        models.FieldReport.zone_id == zone.id,
        models.FieldReport.created_at >= cutoff
    ).count()

    if recent_reports_count >= 3:
        latest_risk = db.query(models.RiskAssessment).filter(
            models.RiskAssessment.zone_id == zone.id
        ).order_by(models.RiskAssessment.timestamp.desc()).first()

        if latest_risk and latest_risk.risk_score < 0.90:
            latest_risk.risk_score = round(min(0.99, latest_risk.risk_score + 0.12), 2)
            if latest_risk.risk_score >= 0.75:
                latest_risk.risk_level = models.RiskLevelEnum.severe
            elif latest_risk.risk_score >= 0.55:
                latest_risk.risk_level = models.RiskLevelEnum.high
            
            factors = latest_risk.contributing_factors or []
            factors.append(f"Crowd-signal risk boost: {recent_reports_count} recent geotagged citizen reports in area")
            latest_risk.contributing_factors = factors
            db.commit()

class ReportStatusUpdate(BaseModel):
    status: str

@router.post("/reports")
async def create_field_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: str = Form(...),
    reporter_type: str = Form("citizen"),
    reporter_name: Optional[str] = Form(None),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Check idempotency to prevent duplicate submissions on spotty connections
    if idempotency_key and idempotency_key in PROCESSED_IDEMPOTENCY_KEYS:
        return PROCESSED_IDEMPOTENCY_KEYS[idempotency_key]

    photo_url = None
    if photo:
        os.makedirs("uploads", exist_ok=True)
        file_ext = os.path.splitext(photo.filename)[1] or ".jpg"
        unique_name = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join("uploads", unique_name)

        contents = await photo.read()
        with open(filepath, "wb") as f:
            f.write(contents)
        photo_url = f"/uploads/{unique_name}"

    matched_zone = find_nearest_zone(latitude, longitude, db)
    zone_id = matched_zone.id if matched_zone else None

    rep_type_enum = models.ReporterTypeEnum.field_officer if reporter_type == "field_officer" else models.ReporterTypeEnum.citizen

    report = models.FieldReport(
        reporter_name=reporter_name or "Anonymous",
        reporter_type=rep_type_enum,
        zone_id=zone_id,
        latitude=latitude,
        longitude=longitude,
        description=description,
        photo_url=photo_url,
        status=models.FieldReportStatusEnum.pending,
        created_at=datetime.utcnow()
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    if matched_zone:
        apply_crowd_signal_risk_boost(matched_zone, db)

    result = {
        "status": "success",
        "report_id": report.id,
        "matched_zone_id": zone_id,
        "matched_zone_name": matched_zone.name if matched_zone else None,
        "photo_url": photo_url,
        "created_at": report.created_at.isoformat()
    }

    if idempotency_key:
        PROCESSED_IDEMPOTENCY_KEYS[idempotency_key] = result

    return result

@router.get("/reports")
def list_field_reports(
    status: Optional[str] = None,
    zone_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.FieldReport)
    if status:
        query = query.filter(models.FieldReport.status == models.FieldReportStatusEnum(status))
    if zone_id:
        query = query.filter(models.FieldReport.zone_id == zone_id)

    reports = query.order_by(models.FieldReport.created_at.desc()).all()
    results = []
    for r in reports:
        zone = db.query(models.Zone).filter(models.Zone.id == r.zone_id).first() if r.zone_id else None
        results.append({
            "id": r.id,
            "reporter_name": r.reporter_name,
            "reporter_type": r.reporter_type.value,
            "zone_id": r.zone_id,
            "zone_name": zone.name if zone else "Unassigned Area",
            "latitude": r.latitude,
            "longitude": r.longitude,
            "description": r.description,
            "photo_url": r.photo_url,
            "status": r.status.value,
            "created_at": r.created_at.isoformat()
        })
    return results

@router.patch("/reports/{report_id}")
def update_report_status(report_id: int, status_update: ReportStatusUpdate, db: Session = Depends(get_db)):
    report = db.query(models.FieldReport).filter(models.FieldReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        report.status = models.FieldReportStatusEnum(status_update.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'pending', 'verified', or 'dismissed'.")

    db.commit()
    return {"status": "success", "report_id": report_id, "new_status": report.status.value}
