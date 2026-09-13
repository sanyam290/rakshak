import os
import sys
from datetime import datetime, timedelta

# Reconfigure stdout for UTF-8 print support on Windows CP1252 shells
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
import models
from seed import seed_database
from pipeline import evaluate_zone_risk

def run_demo_scenario():
    print("=" * 70)
    print("NER-SENTINEL END-TO-END DEMO SCENARIO SIMULATOR")
    print("Simulating Heavy Monsoon Rainfall Surge in Cherrapunji (Sohra)...")
    print("=" * 70)

    db = SessionLocal()
    try:
        # Check if database needs seeding
        zone_count = db.query(models.Zone).count()
        if zone_count == 0:
            print("Database empty. Initializing baseline seed dataset...")
            seed_database()

        # 1. Target Cherrapunji Zone specifically
        zone = db.query(models.Zone).filter(
            models.Zone.name.like("%Cherrapunji%")
        ).first()

        if not zone:
            zone = db.query(models.Zone).first()

        # Reset previous assessments for this zone to LOW so escalation triggers alerts guaranteed
        db.query(models.Alert).filter(models.Alert.zone_id == zone.id).delete()
        db.query(models.RiskAssessment).filter(models.RiskAssessment.zone_id == zone.id).delete()
        
        baseline_risk = models.RiskAssessment(
            zone_id=zone.id,
            timestamp=datetime.utcnow() - timedelta(hours=12),
            risk_score=0.15,
            risk_level=models.RiskLevelEnum.low,
            contributing_factors=["Normal baseline telemetry"],
            model_version="v1.0-baseline"
        )
        db.add(baseline_risk)
        db.commit()

        print(f"\n[STEP 1] Target Zone Selected: {zone.name} (District: {zone.district}, State: {zone.state})")
        print(f"         Baseline Slope: {zone.terrain_slope_deg}°, Historical Landslides: {zone.historical_landslide_count}")
        print("         -> Baseline Risk reset to LOW (15%) for escalation demo.")

        # 2. Inject intense 6-hour rainfall spike readings
        now = datetime.utcnow()
        print("\n[STEP 2] Injecting Telemetry Surge into SensorReading table...")
        
        for i in range(3):
            t_offset = now - timedelta(hours=i * 2)
            spike_reading = models.SensorReading(
                zone_id=zone.id,
                timestamp=t_offset,
                rainfall_mm=55.0, # 3 x 55mm = 165mm cumulative rain
                soil_moisture_pct=92.5 + i * 2.0,
                source=models.SourceEnum.sensor
            )
            db.add(spike_reading)
        
        db.commit()
        print("         -> Injected 165.0mm rainfall surge & 96.5% soil moisture saturation.")

        # 3. Trigger Risk Pipeline Recomputation
        print("\n[STEP 3] Running ML Risk Assessment Pipeline...")
        new_assessment = evaluate_zone_risk(zone, db)

        print(f"         -> Risk Score: {new_assessment.risk_score} (Level: {new_assessment.risk_level.value.upper()})")
        print("         -> Contributing Factors:")
        for factor in new_assessment.contributing_factors:
            print(f"            * {factor}")

        # 4. Fetch Generated Multilingual Alerts
        alerts = db.query(models.Alert).filter(
            models.Alert.risk_assessment_id == new_assessment.id
        ).all()

        print(f"\n[STEP 4] Multilingual Alerts & SMS Gateway Broadcast Cascade ({len(alerts)} alerts created):")
        for alert in alerts:
            safe_msg = alert.message.encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"         [{alert.channel.value.upper()}] Lang: {alert.language.upper()} -> {safe_msg}")

        # 5. Blocked Road Status Simulation
        road = db.query(models.Road).filter(models.Road.zone_id == zone.id).first()
        if road:
            road.connectivity_status = models.RoadStatusEnum.blocked
            road.last_updated = datetime.utcnow()
            db.commit()
            print(f"\n[STEP 5] Critical Road Connectivity Update: '{road.name}' set to BLOCKED.")

        print("\n" + "=" * 70)
        print("SCENARIO SIMULATION COMPLETED SUCCESSFULLY!")
        print("Live GIS Dashboard and Mobile Clients updated via WebSocket broadcast.")
        print("=" * 70)

        return {
            "status": "success",
            "zone": zone.name,
            "risk_level": new_assessment.risk_level.value,
            "risk_score": new_assessment.risk_score,
            "alerts_generated": len(alerts)
        }
    except Exception as e:
        print(f"Scenario simulation error: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_demo_scenario()
