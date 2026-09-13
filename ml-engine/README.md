# ML Landslide Risk Prediction Engine

## Overview
This microservice trains and serves an XGBoost / RandomForest classifier for predicting real-time landslide risk across monitoring zones in the North Eastern Region (NER) of India.

## Synthetic Training & Production Swap Roadmap
For prototype and hackathon demonstration purposes, the model is trained on a synthetic dataset generated via geotechnical physics heuristics combining:
- 24-hour cumulative rainfall (mm)
- 72-hour cumulative rainfall (mm)
- Soil moisture saturation percentage (%)
- Terrain slope angle (degrees)
- Historical landslide incident density
- Satellite SAR surface deformation score

### Production Swap Roadmap
In production, this synthetic dataset should be replaced with real-world data sources:
1. **Bhukosh / GSI Landslide Inventory**: Geological Survey of India historical landslide hazard maps and polygon inventories.
2. **IMD High-Resolution Gridded Rainfall**: Historical 0.25° gridded daily rainfall data.
3. **ISRO Bhuvan & Sentinel-1 InSAR**: Differential Interferometric Synthetic Aperture Radar (DInSAR) ground displacement telemetry.
4. **SRTM / TanDEM-X DEM**: 30m Digital Elevation Models for exact slope angle and flow accumulation calculations.
