import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
import models
from .providers import IMDWeatherProvider, SatelliteImageryProvider, SensorNetworkProvider

logger = logging.getLogger("ingestion_scheduler")
logging.basicConfig(level=logging.INFO)

imd_provider = IMDWeatherProvider()
sat_provider = SatelliteImageryProvider()
sensor_provider = SensorNetworkProvider()

def run_ingestion_job():
    """
    Background polling job running every 15 minutes.
    Polls IMD weather, Satellite imagery, and IoT sensor network data, storing new SensorReadings.
    """
    db = SessionLocal()
    try:
        zones = db.query(models.Zone).all()
        logger.info(f"[{datetime.utcnow()}] Ingestion Job Started for {len(zones)} zones.")

        for zone in zones:
            # 1. Fetch sensor telemetry
            reading_data = sensor_provider.get_latest_readings(zone.id, db)
            
            # 2. Fetch IMD forecast
            weather_forecast = imd_provider.get_forecast(zone.id)
            
            # 3. Fetch satellite scores
            sat_data = sat_provider.get_latest_imagery(zone.id)

            # Persist sensor reading
            new_reading = models.SensorReading(
                zone_id=zone.id,
                timestamp=datetime.utcnow(),
                rainfall_mm=reading_data["rainfall_mm"],
                soil_moisture_pct=reading_data["soil_moisture_pct"],
                source=models.SourceEnum.sensor
            )
            db.add(new_reading)
        
        db.commit()
        logger.info(f"[{datetime.utcnow()}] Ingestion Job Completed successfully.")
    except Exception as e:
        logger.error(f"Error in ingestion job: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler(interval_minutes: int = 15):
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_ingestion_job, 'interval', minutes=interval_minutes, id="telemetry_ingestion")
    scheduler.start()
    logger.info(f"Background Ingestion Scheduler started with {interval_minutes}m interval.")
    return scheduler
