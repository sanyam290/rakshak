export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';
export type RoadStatus = 'open' | 'restricted' | 'blocked';

export interface Zone {
  id: number;
  name: string;
  district: string;
  state: string;
  terrain_slope_deg: number;
  soil_type: string;
  historical_landslide_count: number;
  geometry_json: [number, number][];
  current_risk_score: number;
  current_risk_level: RiskLevel;
  contributing_factors: string[];
  latest_rainfall_mm: number;
  latest_soil_moisture_pct: number;
}

export interface AlertItem {
  id: number;
  zone_id: number;
  zone_name: string;
  district: string;
  severity: RiskLevel;
  message: string;
  language: string;
  channel: 'app' | 'sms';
  sent_at: string;
  acknowledged: boolean;
}

export interface RoadItem {
  id: number;
  name: string;
  zone_id: number;
  zone_name: string;
  geometry_json: [number, number][];
  connectivity_status: RoadStatus;
  last_updated: string;
}

export interface FieldReportItem {
  id: number;
  reporter_name: string;
  reporter_type: 'citizen' | 'field_officer';
  zone_id?: number;
  zone_name: string;
  latitude: number;
  longitude: number;
  description: string;
  photo_url?: string;
  status: 'pending' | 'verified' | 'dismissed';
  created_at: string;
}

export interface RiskHistoryPoint {
  timestamp: string;
  rainfall_mm: number;
  soil_moisture_pct: number;
  risk_score: number;
}
