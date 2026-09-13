import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, classification_report
from sklearn.model_selection import train_test_split

np.random.seed(42)

def generate_synthetic_geotechnical_dataset(n_samples: int = 3000) -> pd.DataFrame:
    """
    Generates a realistic synthetic geotechnical dataset for landslide risk prediction in NER terrain.
    """
    # Feature distributions based on NER terrain physics
    rainfall_24h = np.random.uniform(5.0, 220.0, n_samples)
    rainfall_72h = rainfall_24h * np.random.uniform(1.2, 2.5, n_samples) + np.random.uniform(0, 50, n_samples)
    soil_moisture = np.random.uniform(20.0, 98.0, n_samples)
    slope_deg = np.random.uniform(15.0, 52.0, n_samples)
    historical_count = np.random.randint(0, 30, n_samples)
    sat_change_score = np.random.uniform(0.01, 0.45, n_samples)

    # Physical heuristic function for landslide occurrence probability (ground truth formula)
    # Landslide trigger = f(rainfall, soil moisture, slope steepness, slope deformation, history)
    slope_factor = (slope_deg / 50.0) ** 1.5
    rain_factor = (rainfall_24h / 120.0) ** 1.8 + (rainfall_72h / 250.0) ** 1.2
    soil_factor = (soil_moisture / 100.0) ** 2.0
    sat_factor = (sat_change_score / 0.3) ** 1.3
    hist_factor = (historical_count / 25.0) ** 0.5

    prob = 0.35 * rain_factor * soil_factor + 0.30 * slope_factor + 0.20 * sat_factor + 0.15 * hist_factor
    # Add random noise
    prob_noisy = np.clip(prob + np.random.normal(0, 0.08, n_samples), 0.0, 1.0)
    
    # Binary classification label (1 = Landslide hazard imminent, 0 = Stable)
    labels = (prob_noisy > 0.62).astype(int)

    df = pd.DataFrame({
        'rainfall_mm_24h': np.round(rainfall_24h, 1),
        'rainfall_mm_72h': np.round(rainfall_72h, 1),
        'soil_moisture_pct': np.round(soil_moisture, 1),
        'slope_deg': np.round(slope_deg, 1),
        'historical_landslide_count': historical_count,
        'satellite_change_score': np.round(sat_change_score, 3),
        'landslide_hazard': labels,
        'risk_score': np.round(prob_noisy, 3)
    })
    return df

def train_and_save_model(model_path: str = "landslide_model.joblib"):
    print("Generating synthetic geotechnical training dataset (3,000 samples)...")
    df = generate_synthetic_geotechnical_dataset(3000)

    feature_cols = [
        'rainfall_mm_24h', 'rainfall_mm_72h', 'soil_moisture_pct',
        'slope_deg', 'historical_landslide_count', 'satellite_change_score'
    ]
    X = df[feature_cols]
    y = df['landslide_hazard']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("Training RandomForest Landslide Classifier...")
    model = RandomForestClassifier(n_estimators=120, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc_score = roc_auc_score(y_test, y_pred_proba)
    print(f"Model Training Complete! ROC-AUC Score: {auc_score:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, model.predict(X_test)))

    # Feature Importance
    importances = dict(zip(feature_cols, model.feature_importances_))
    print("Feature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {feat}: {imp:.4f}")

    # Save model artifact and metadata
    artifact = {
        'model': model,
        'feature_cols': feature_cols,
        'importances': importances,
        'auc_score': auc_score
    }
    joblib.dump(artifact, model_path)
    print(f"Model saved successfully to '{model_path}'!")

if __name__ == "__main__":
    train_and_save_model()
