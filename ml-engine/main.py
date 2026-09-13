from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from predict import (
    RiskPredictionRequest,
    RiskPredictionResponse,
    BatchRiskPredictionRequest,
    predict_single_zone
)

app = FastAPI(
    title="NER-Sentinel ML Risk Engine",
    description="Microservice providing XGBoost Landslide Risk Scoring & Feature Importance Explanations",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ml-engine",
        "version": "1.0.0"
    }

@app.post("/predict", response_model=RiskPredictionResponse)
def predict_risk(request: RiskPredictionRequest):
    try:
        return predict_single_zone(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-predict", response_model=List[RiskPredictionResponse])
def batch_predict_risk(batch_req: BatchRiskPredictionRequest):
    try:
        results = [predict_single_zone(item) for item in batch_req.items]
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
