import random
from datetime import datetime, timedelta
from database import SessionLocal, engine
import models

def seed_database():
    models.init_db()
    db = SessionLocal()

    # Clear existing data
    db.query(models.Alert).delete()
    db.query(models.FieldReport).delete()
    db.query(models.RiskAssessment).delete()
    db.query(models.SensorReading).delete()
    db.query(models.Road).delete()
    db.query(models.Zone).delete()
    db.commit()

    print("Seeding NER-Sentinel Zones & Geographical Data...")

    # Realistic NER Zones with GeoJSON Polygon Coordinates [[lng, lat], ...]
    zones_data = [
        {
            "name": "Cherrapunji (Sohra) Ridge",
            "district": "East Khasi Hills",
            "state": "Meghalaya",
            "slope": 38.5,
            "soil": "Sandstone Clay",
            "historical_count": 14,
            "geometry": [
                [91.68, 25.26], [91.75, 25.26], [91.75, 25.32], [91.68, 25.32], [91.68, 25.26]
            ],
            "road": {
                "name": "SH-5 Sohra-Shillong Highway",
                "geometry": [[91.69, 25.27], [91.72, 25.29], [91.74, 25.31]]
            }
        },
        {
            "name": "Shillong Bypass Pass",
            "district": "Ri-Bhoi",
            "state": "Meghalaya",
            "slope": 32.0,
            "soil": "Metamorphic Schist",
            "historical_count": 8,
            "geometry": [
                [91.85, 25.55], [91.93, 25.55], [91.93, 25.62], [91.85, 25.62], [91.85, 25.55]
            ],
            "road": {
                "name": "NH-6 Shillong Bypass Link",
                "geometry": [[91.86, 25.56], [91.89, 25.58], [91.92, 25.61]]
            }
        },
        {
            "name": "Lunglei South Ridge",
            "district": "Lunglei",
            "state": "Mizoram",
            "slope": 41.2,
            "soil": "Weathered Shale Loam",
            "historical_count": 19,
            "geometry": [
                [92.70, 22.84], [92.77, 22.84], [92.77, 22.91], [92.70, 22.91], [92.70, 22.84]
            ],
            "road": {
                "name": "NH-54 Lunglei-Lawngtlai Road",
                "geometry": [[92.71, 22.85], [92.74, 22.87], [92.76, 22.90]]
            }
        },
        {
            "name": "Aizawl North Ridge",
            "district": "Aizawl",
            "state": "Mizoram",
            "slope": 36.4,
            "soil": "Sandstone Shale",
            "historical_count": 12,
            "geometry": [
                [92.68, 23.70], [92.76, 23.70], [92.76, 23.77], [92.68, 23.77], [92.68, 23.70]
            ],
            "road": {
                "name": "Aizawl Central Arterial Road",
                "geometry": [[92.69, 23.71], [92.72, 23.73], [92.75, 23.76]]
            }
        },
        {
            "name": "Imphal-Jiribam Highway Sector",
            "district": "Tamenglong",
            "state": "Manipur",
            "slope": 35.8,
            "soil": "Clayey Silt Shale",
            "historical_count": 15,
            "geometry": [
                [93.45, 24.78], [93.55, 24.78], [93.55, 24.86], [93.45, 24.86], [93.45, 24.78]
            ],
            "road": {
                "name": "NH-37 Imphal-Jiribam Highway",
                "geometry": [[93.46, 24.79], [93.50, 24.82], [93.54, 24.85]]
            }
        },
        {
            "name": "Senapati Hill Pass",
            "district": "Senapati",
            "state": "Manipur",
            "slope": 31.5,
            "soil": "Gravelly Loam",
            "historical_count": 7,
            "geometry": [
                [93.90, 25.20], [93.98, 25.20], [93.98, 25.28], [93.90, 25.28], [93.90, 25.20]
            ],
            "road": {
                "name": "NH-2 Imphal-Dimapur Road",
                "geometry": [[93.91, 25.21], [93.94, 25.24], [93.97, 25.27]]
            }
        },
        {
            "name": "Haflong Hill Sector",
            "district": "Dima Hasao",
            "state": "Assam",
            "slope": 39.0,
            "soil": "Unconsolidated Soft Shale",
            "historical_count": 22,
            "geometry": [
                [93.00, 25.12], [93.09, 25.12], [93.09, 25.20], [93.00, 25.20], [93.00, 25.12]
            ],
            "road": {
                "name": "Haflong-Lumding Hill Railway & Highway",
                "geometry": [[93.01, 25.13], [93.05, 25.16], [93.08, 25.19]]
            }
        },
        {
            "name": "Kamakhya Foothill Zone",
            "district": "Kamrup Metropolitan",
            "state": "Assam",
            "slope": 27.5,
            "soil": "Red Alluvial Clay",
            "historical_count": 5,
            "geometry": [
                [91.70, 26.14], [91.76, 26.14], [91.76, 26.19], [91.70, 26.19], [91.70, 26.14]
            ],
            "road": {
                "name": "Kamakhya Temple Bypass Road",
                "geometry": [[91.71, 26.15], [91.73, 26.16], [91.75, 26.18]]
            }
        }
    ]

    created_zones = []
    for zd in zones_data:
        zone = models.Zone(
            name=zd["name"],
            district=zd["district"],
            state=zd["state"],
            terrain_slope_deg=zd["slope"],
            soil_type=zd["soil"],
            historical_landslide_count=zd["historical_count"],
            geometry_json=zd["geometry"]
        )
        db.add(zone)
        db.flush()

        road = models.Road(
            name=zd["road"]["name"],
            geometry_json=zd["road"]["geometry"],
            zone_id=zone.id,
            connectivity_status=models.RoadStatusEnum.open,
            last_updated=datetime.utcnow()
        )
        db.add(road)
        created_zones.append(zone)

    db.commit()

    print(f"Created {len(created_zones)} zones with roads. Seeding 30 days of sensor reading history...")

    now = datetime.utcnow()
    start_time = now - timedelta(days=30)

    # 3-hour interval readings over 30 days = 240 intervals
    for zone in created_zones:
        current_time = start_time
        # Pick 2-3 specific days in the past month where rainfall spikes high
        spike_days = [7, 18, 26] if zone.id % 2 == 0 else [4, 15, 28]

        while current_time <= now:
            day_offset = (current_time - start_time).days
            
            if day_offset in spike_days:
                # Heavy monsoon spike (simulate landslide trigger window)
                rainfall = round(random.uniform(90.0, 180.0), 1)
                soil_moisture = round(random.uniform(78.0, 96.0), 1)
            elif day_offset in [sd - 1 for sd in spike_days]:
                # Pre-spike build up
                rainfall = round(random.uniform(35.0, 75.0), 1)
                soil_moisture = round(random.uniform(55.0, 75.0), 1)
            else:
                # Normal rainfall
                rainfall = round(random.uniform(0.0, 25.0), 1)
                soil_moisture = round(random.uniform(25.0, 55.0), 1)

            reading = models.SensorReading(
                zone_id=zone.id,
                timestamp=current_time,
                rainfall_mm=rainfall,
                soil_moisture_pct=soil_moisture,
                source=models.SourceEnum.sensor
            )
            db.add(reading)
            current_time += timedelta(hours=3)

    db.commit()

    # Create initial baseline RiskAssessment for each zone
    print("Generating baseline Risk Assessments...")
    for zone in created_zones:
        # Calculate recent rainfall summary
        latest_reading = db.query(models.SensorReading).filter(
            models.SensorReading.zone_id == zone.id
        ).order_by(models.SensorReading.timestamp.desc()).first()

        rainfall = latest_reading.rainfall_mm if latest_reading else 15.0
        soil = latest_reading.soil_moisture_pct if latest_reading else 40.0

        # Heuristic baseline risk score
        score = min(0.99, (rainfall / 150.0) * 0.4 + (soil / 100.0) * 0.3 + (zone.terrain_slope_deg / 50.0) * 0.3)
        if score > 0.75:
            level = models.RiskLevelEnum.severe
        elif score > 0.55:
            level = models.RiskLevelEnum.high
        elif score > 0.35:
            level = models.RiskLevelEnum.moderate
        else:
            level = models.RiskLevelEnum.low

        risk = models.RiskAssessment(
            zone_id=zone.id,
            timestamp=now,
            risk_score=round(score, 2),
            risk_level=level,
            contributing_factors=[f"Baseline check: Rainfall {rainfall}mm, Soil moisture {soil}%"],
            model_version="v1.0-baseline"
        )
        db.add(risk)

    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
