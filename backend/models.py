import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum as SQLEnum, Text, JSON
from sqlalchemy.orm import relationship
from database import Base, engine, DATABASE_URL

# Enums
class SourceEnum(str, enum.Enum):
    sensor = "sensor"
    satellite = "satellite"
    manual = "manual"

class RiskLevelEnum(str, enum.Enum):
    low = "low"
    moderate = "moderate"
    high = "high"
    severe = "severe"

class ReporterTypeEnum(str, enum.Enum):
    citizen = "citizen"
    field_officer = "field_officer"

class FieldReportStatusEnum(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    dismissed = "dismissed"

class RoadStatusEnum(str, enum.Enum):
    open = "open"
    restricted = "restricted"
    blocked = "blocked"

class ChannelEnum(str, enum.Enum):
    app = "app"
    sms = "sms"

# Models
class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    geometry_json = Column(JSON, nullable=False) # Polygon GeoJSON coordinates array [[[lng, lat], ...]]
    terrain_slope_deg = Column(Float, nullable=False)
    soil_type = Column(String(50), nullable=False)
    historical_landslide_count = Column(Integer, default=0)

    sensor_readings = relationship("SensorReading", back_populates="zone", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="zone", cascade="all, delete-orphan")
    field_reports = relationship("FieldReport", back_populates="zone")
    roads = relationship("Road", back_populates="zone")
    alerts = relationship("Alert", back_populates="zone")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    rainfall_mm = Column(Float, nullable=False)
    soil_moisture_pct = Column(Float, nullable=False)
    source = Column(SQLEnum(SourceEnum), default=SourceEnum.sensor)

    zone = relationship("Zone", back_populates="sensor_readings")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(SQLEnum(RiskLevelEnum), nullable=False)
    contributing_factors = Column(JSON, nullable=True)
    model_version = Column(String(50), default="v1.0-xgboost")

    zone = relationship("Zone", back_populates="risk_assessments")
    alerts = relationship("Alert", back_populates="risk_assessment")

class FieldReport(Base):
    __tablename__ = "field_reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_name = Column(String(100), nullable=True)
    reporter_type = Column(SQLEnum(ReporterTypeEnum), default=ReporterTypeEnum.citizen)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    photo_url = Column(String(255), nullable=True)
    video_url = Column(String(255), nullable=True)
    status = Column(SQLEnum(FieldReportStatusEnum), default=FieldReportStatusEnum.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="field_reports")

class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    geometry_json = Column(JSON, nullable=False) # LineString GeoJSON coordinates [[lng, lat], ...]
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    connectivity_status = Column(SQLEnum(RoadStatusEnum), default=RoadStatusEnum.open)
    last_updated = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="roads")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    risk_assessment_id = Column(Integer, ForeignKey("risk_assessments.id"), nullable=True)
    severity = Column(SQLEnum(RiskLevelEnum), nullable=False)
    message = Column(Text, nullable=False)
    language = Column(String(20), default="en")
    channel = Column(SQLEnum(ChannelEnum), default=ChannelEnum.app)
    sent_at = Column(DateTime, default=datetime.utcnow)
    acknowledged = Column(Boolean, default=False)

    zone = relationship("Zone", back_populates="alerts")
    risk_assessment = relationship("RiskAssessment", back_populates="alerts")

def init_db():
    Base.metadata.create_all(bind=engine)
