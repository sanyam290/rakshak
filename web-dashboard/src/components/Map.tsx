import React from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { Zone, RoadItem, FieldReportItem, RiskLevel } from '../types';

// Leaflet icon fix for React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  zones: Zone[];
  roads: RoadItem[];
  reports: FieldReportItem[];
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone) => void;
}

const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case 'severe': return '#EF4444'; // Red
    case 'high': return '#F97316';   // Orange
    case 'moderate': return '#F59E0B'; // Yellow
    case 'low': default: return '#10B981'; // Green
  }
};

const getRoadColor = (status: string): string => {
  switch (status) {
    case 'blocked': return '#EF4444';
    case 'restricted': return '#F97316';
    case 'open': default: return '#10B981';
  }
};

export const Map: React.FC<MapProps> = ({ zones, roads, reports, selectedZone, onSelectZone }) => {
  // Center of North Eastern Region (around Shillong/Guwahati)
  const centerLat = 25.57;
  const centerLng = 92.50;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={7}
      scrollWheelZoom={true}
      className="w-full h-full rounded-lg shadow-inner"
    >
      <LayersControl position="topright">
        {/* Layer 1: ESRI World Dark Canvas (Zero API Key Needed) */}
        <LayersControl.BaseLayer checked name="Dark Canvas (Esri)">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        {/* Layer 2: OpenStreetMap Standard (Zero API Key Needed) */}
        <LayersControl.BaseLayer name="OpenStreetMap Standard">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        {/* Layer 3: ESRI Satellite Imagery (Zero API Key Needed) */}
        <LayersControl.BaseLayer name="Satellite Imagery (Esri)">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri World Imagery</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* 1. Zone Risk Heatmap Polygons */}
      {zones.map((zone) => {
        const positions: [number, number][] = zone.geometry_json.map(coord => [coord[1], coord[0]]);
        const isSelected = selectedZone?.id === zone.id;
        const color = getRiskColor(zone.current_risk_level);

        return (
          <Polygon
            key={`zone-${zone.id}`}
            positions={positions}
            pathOptions={{
              color: isSelected ? '#38BDF8' : color,
              fillColor: color,
              fillOpacity: isSelected ? 0.65 : 0.40,
              weight: isSelected ? 3 : 2,
              dashArray: isSelected ? undefined : '4'
            }}
            eventHandlers={{
              click: () => onSelectZone(zone)
            }}
          >
            <Popup>
              <div className="text-slate-900 text-xs font-sans">
                <h3 className="font-bold text-sm text-slate-900 mb-1">{zone.name}</h3>
                <p><strong>District:</strong> {zone.district}, {zone.state}</p>
                <p><strong>Risk Level:</strong> <span className="uppercase font-bold" style={{ color: color }}>{zone.current_risk_level}</span></p>
                <p><strong>Risk Score:</strong> {(zone.current_risk_score * 100).toFixed(0)}%</p>
                <p><strong>Slope:</strong> {zone.terrain_slope_deg}°</p>
              </div>
            </Popup>
          </Polygon>
        );
      })}

      {/* 2. Road Network Overlay */}
      {roads.map((road) => {
        const positions: [number, number][] = road.geometry_json.map(coord => [coord[1], coord[0]]);
        const color = getRoadColor(road.connectivity_status);

        return (
          <Polyline
            key={`road-${road.id}`}
            positions={positions}
            pathOptions={{
              color: color,
              weight: 4,
              opacity: 0.85
            }}
          >
            <Popup>
              <div className="text-slate-900 text-xs">
                <h4 className="font-bold">{road.name}</h4>
                <p>Status: <span className="uppercase font-bold" style={{ color }}>{road.connectivity_status}</span></p>
                <p>Zone: {road.zone_name}</p>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {/* 3. Geotagged Field Report Pins (Dismissed reports are hidden from the map) */}
      {reports.filter(report => report.status !== 'dismissed').map((report) => (
        <Marker key={`report-${report.id}`} position={[report.latitude, report.longitude]}>
          <Popup>
            <div className="text-slate-900 text-xs max-w-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                  {report.reporter_type === 'field_officer' ? '🛡️ Officer' : '🏡 Citizen'} Report
                </span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  report.status === 'verified'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                    : 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                }`}>
                  {report.status}
                </span>
              </div>
              <p className="mt-1 font-medium text-slate-800">{report.description}</p>
              {report.photo_url && (
                <img
                  src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000${report.photo_url}`}
                  alt="Report capture"
                  className="w-full h-28 object-cover rounded mt-1.5 border border-slate-300"
                />
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
