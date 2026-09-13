import os
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Any
from pydantic import BaseModel, Field

MODEL_PATH = os.getenv("MODEL_PATH", "landslide_model.joblib")

# Input Schemas
class RiskPredictionRequest(BaseModel):
    zone_id: int
    rainfall_mm_24h: float = Field(..., description="Cumulative 24h rainfall in mm")
    rainfall_mm_72h: float = Field(..., description="Cumulative 72h rainfall in mm")
    soil_moisture_pct: float = Field(..., description="Soil moisture saturation percentage 0-100")
    slope_deg: float = Field(..., description="Terrain slope angle in degrees")
    historical_landslide_count: int = Field(..., description="Historical incident count for zone")
    satellite_change_score: float = Field(default=0.1, description="Deformation / NDVI change score 0-1")

class RiskPredictionResponse(BaseModel):
    zone_id: int
    risk_score: float
    risk_level: str
    contributing_factors: List[str]

class BatchRiskPredictionRequest(BaseModel):
    items: List[RiskPredictionRequest]

# Global Model Cache
_model_artifact = None

def get_model():
    global _model_artifact
    if _model_artifact is None:
        if not os.path.exists(MODEL_PATH):
            print(f"Model file '{MODEL_PATH}' not found. Training model now...")
            from train import train_and_save_model
            train_and_save_model(MODEL_PATH)
        _model_artifact = joblib.load(MODEL_PATH)
    return _model_artifact

def generate_contributing_factors(req: RiskPredictionRequest, risk_score: float) -> List[str]:
    factors = []
    if req.rainfall_mm_24h > 90.0:
        factors.append(f"Heavy 24h rainfall surge ({req.rainfall_mm_24h:.1f} mm)")
    elif req.rainfall_mm_24h > 50.0:
        factors.append(f"Moderate 24h rainfall ({req.rainfall_mm_24h:.1f} mm)")

    if req.rainfall_mm_72h > 180.0:
        factors.append(f"High cumulative 72h saturation ({req.rainfall_mm_72h:.1f} mm)")

    if req.soil_moisture_pct > 75.0:
        factors.append(f"High soil moisture saturation ({req.soil_moisture_pct:.1f}%)")

    if req.slope_deg > 30.0:
        factors.append(f"Steep terrain gradient ({req.slope_deg:.1f}° slope)")

    if req.satellite_change_score > 0.25:
        factors.append(f"Satellite SAR slope surface movement detected ({req.satellite_change_score:.2f} displacement score)")

    if req.historical_landslide_count >= 10:
        factors.append(f"High historical hazard frequency ({req.historical_landslide_count} prior incidents)")

    if not factors:
        factors.append("Normal meteorologic and geotechnical baseline conditions")

    return factors

def predict_single_zone(req: RiskPredictionRequest) -> RiskPredictionResponse:
    artifact = get_model()
    model = artifact['model']
    feature_cols = artifact['feature_cols']
    
    features_df = pd.DataFrame([[
        req.rainfall_mm_24h,
        req.rainfall_mm_72h,
        req.soil_moisture_pct,
        req.slope_deg,
        req.historical_landslide_count,
        req.satellite_change_score
    ]], columns=feature_cols)

    # Class 1 probability = hazard score
    risk_score_raw = model.predict_proba(features_df)[0][1]
    
    # Scale score with terrain physics weight
    physics_adjust = min(0.3, (req.slope_deg / 50.0) * 0.15 + (req.soil_moisture_pct / 100.0) * 0.15)
    final_score = float(np.clip(risk_score_raw + physics_adjust, 0.02, 0.99))

    # Categorize Risk Level
    if final_score >= 0.75:
        risk_level = "severe"
    elif final_score >= 0.55:
        risk_level = "high"
    elif final_score >= 0.35:
        risk_level = "moderate"
    else:
        risk_level = "low"

    factors = generate_contributing_factors(req, final_score)

    return RiskPredictionResponse(
        zone_id=req.zone_id,
        risk_score=round(final_score, 2),
        risk_level=risk_level,
        contributing_factors=factors
    )
