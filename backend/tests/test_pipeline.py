import os
import sys
from datetime import datetime
import pytest

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal, Base, engine
import models
from pipeline import evaluate_zone_risk

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_rainfall_spike_triggers_risk_escalation_and_alerts(db_session):
    # 1. Create a test zone
    zone = models.Zone(
        name="Test Sohra Ridge",
        district="East Khasi Hills",
        state="Meghalaya",
        terrain_slope_deg=42.0,
        soil_type="Sandstone Clay",
        historical_landslide_count=15,
        geometry_json=[[91.68, 25.26], [91.75, 25.26], [91.75, 25.32], [91.68, 25.26]]
    )
    db_session.add(zone)
    db_session.commit()
    db_session.refresh(zone)

    # 2. Inject heavy rainfall spike readings (simulate 150mm rain in last 24h)
    now = datetime.utcnow()
    reading = models.SensorReading(
        zone_id=zone.id,
        timestamp=now,
        rainfall_mm=150.0,
        soil_moisture_pct=88.5,
        source=models.SourceEnum.sensor
    )
    db_session.add(reading)
    db_session.commit()

    # 3. Evaluate risk pipeline
    assessment = evaluate_zone_risk(zone, db_session)

    # 4. Verify assessment escalation
    assert assessment.risk_score >= 0.55
    assert assessment.risk_level.value in ["high", "severe"]

    # 5. Verify Multilingual Alerts generated in database
    alerts = db_session.query(models.Alert).filter(models.Alert.zone_id == zone.id).all()
    assert len(alerts) > 0
    languages = [a.language for a in alerts]
    assert "en" in languages
    assert "as" in languages
    assert "hi" in languages
