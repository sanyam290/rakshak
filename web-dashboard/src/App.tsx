import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Globe, Play, FileText, AlertCircle, RefreshCw, Volume2, Camera, UserCheck } from 'lucide-react';
import { Zone, RoadItem, AlertItem, FieldReportItem, RiskHistoryPoint, RiskLevel } from './types';
import { TRANSLATIONS, Language } from './i18n';
import { Map } from './components/Map';
import { KpiBar } from './components/KpiBar';
import { AlertsPanel } from './components/AlertsPanel';
import { RiskChart } from './components/RiskChart';
import { AdminNotifications } from './components/AdminNotifications';
import { EmergencyAlarmModal } from './components/EmergencyAlarmModal';
import { ReportModal } from './components/ReportModal';
import { AdminPanel } from './components/AdminPanel';

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE = import.meta.env.VITE_API_URL || `http://${hostname}:8000`;
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${hostname}:8000/ws/live`;

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [zones, setZones] = useState<Zone[]>([]);
  const [roads, setRoads] = useState<RoadItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [reports, setReports] = useState<FieldReportItem[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskHistoryPoint[]>([]);
  const [showAdminLog, setShowAdminLog] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [showTotalZonesModal, setShowTotalZonesModal] = useState<boolean>(false);
  const [showHighRiskModal, setShowHighRiskModal] = useState<boolean>(false);
  const [showBlockedRoadsModal, setShowBlockedRoadsModal] = useState<boolean>(false);
  const [showActiveAlertsModal, setShowActiveAlertsModal] = useState<boolean>(false);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<AlertItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);

  const t = TRANSLATIONS[lang];

  // Mobile Device Detection (Rings siren automatically ONLY on mobile phones in hazard zones)
  const isMobileDevice = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    window.innerWidth < 768 ||
    window.location.hostname !== 'localhost'
  );

  const fetchData = async () => {
    try {
      const [zonesRes, roadsRes, alertsRes, reportsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/zones`),
        axios.get(`${API_BASE}/api/roads`),
        axios.get(`${API_BASE}/api/alerts`),
        axios.get(`${API_BASE}/api/reports`)
      ]);

      setZones(zonesRes.data);
      setRoads(roadsRes.data);
      setAlerts(alertsRes.data);
      setReports(reportsRes.data);

      if (zonesRes.data.length > 0 && !selectedZone) {
        setSelectedZone(zonesRes.data[0]);
      }

      // PHONE SIREN TARGET: If accessed from a mobile phone in a disaster zone, auto-ring emergency siren!
      if (isMobileDevice) {
        const severeAlert = alertsRes.data.find((a: AlertItem) => !a.acknowledged && (a.severity === 'severe' || a.severity === 'high'));
        if (severeAlert && !activeEmergencyAlert) {
          setActiveEmergencyAlert(severeAlert);
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskHistory = async (zoneId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/api/zones/${zoneId}/risk-history`);
      setRiskHistory(res.data.history);
    } catch (err) {
      console.error("Error fetching risk history:", err);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup WebSocket connection for live updates
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket event received:", data);
        fetchData();
      } catch (e) {
        console.error("Error parsing WebSocket frame", e);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (selectedZone) {
      fetchRiskHistory(selectedZone.id);
    }
  }, [selectedZone]);

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await axios.post(`${API_BASE}/api/alerts/${alertId}/acknowledge`);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
      if (activeEmergencyAlert?.id === alertId) {
        setActiveEmergencyAlert(null);
      }
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const triggerEvaluationPipeline = async () => {
    setSimulating(true);
    try {
      await axios.post(`${API_BASE}/api/pipeline/evaluate`);
      await fetchData();
    } catch (err) {
      console.error("Failed to trigger pipeline evaluation:", err);
    } finally {
      setSimulating(false);
    }
  };

  const triggerTestEmergencyAlarm = () => {
    const dummyAlert: AlertItem = {
      id: Date.now(),
      zone_id: selectedZone ? selectedZone.id : 1,
      zone_name: selectedZone ? selectedZone.name : "Cherrapunji (Sohra) Sector",
      district: selectedZone ? selectedZone.district : "East Khasi Hills",
      severity: "severe",
      message: "GEOFENCED HAZARD ALARM: Severe landslide failure risk detected at your location. EVACUATE low-lying mountain slopes immediately.",
      language: lang,
      channel: "app",
      sent_at: new Date().toISOString(),
      acknowledged: false
    };
    setActiveEmergencyAlert(dummyAlert);
  };

  const getBadgeColor = (level: RiskLevel) => {
    switch (level) {
      case 'severe': return 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)] animate-pulse';
      case 'high': return 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
      case 'moderate': return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40';
      case 'low': default: return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050811] text-slate-100 overflow-hidden font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-black">
      {/* Header Bar */}
      <header className="h-12 shrink-0 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-3 flex items-center justify-between shadow-2xl z-20 overflow-x-auto">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-wide text-slate-100 flex items-center gap-1.5 font-mono">
              {t.appTitle}
              <span className="inline-flex items-center gap-1 text-[8px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                Live GIS Radar
              </span>
            </h1>
            <p className="text-[9px] text-slate-400 tracking-normal hidden sm:block">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs shrink-0">
          <button
            onClick={() => setShowAdminPanel(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-sky-950 to-indigo-950 hover:from-sky-900 hover:to-indigo-900 text-sky-200 border border-sky-600/80 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-[0_0_10px_rgba(14,165,233,0.2)] hover:scale-[1.02]"
          >
            <UserCheck size={13} className="text-sky-400" />
            ADMIN PANEL
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-emerald-600/60 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
          >
            <Camera size={13} className="text-emerald-400" />
            Upload Report
          </button>

          <button
            onClick={triggerTestEmergencyAlarm}
            className="flex items-center gap-1 bg-gradient-to-r from-rose-950 to-pink-950 hover:from-rose-900 hover:to-pink-900 text-rose-200 border border-rose-700/80 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse hover:scale-[1.02]"
          >
            <Volume2 size={13} className="text-rose-400" />
            SIREN TEST
          </button>

          <button
            onClick={triggerEvaluationPipeline}
            disabled={simulating}
            className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-sky-700/60 px-2.5 py-1 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
          >
            <RefreshCw size={12} className={simulating ? "animate-spin text-sky-400" : ""} />
            Evaluate Risk
          </button>

          <button
            onClick={() => setShowAdminLog(true)}
            className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2.5 py-1 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
          >
            <FileText size={12} />
            Audit Log
          </button>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 shadow-inner">
            <Globe size={12} className="text-slate-400" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-transparent text-slate-200 text-[11px] outline-none cursor-pointer font-medium"
            >
              <option value="en" className="bg-slate-900">EN</option>
              <option value="as" className="bg-slate-900">অসমীয়া</option>
              <option value="hi" className="bg-slate-900">हिंदी</option>
              <option value="mn" className="bg-slate-900">মৈতৈলোন্</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-2.5 flex flex-col gap-2.5 min-h-0 overflow-hidden">
        {/* KPI Top Bar */}
        <KpiBar
          zones={zones}
          roads={roads}
          alerts={alerts}
          lang={lang}
          onOpenTotalZones={() => setShowTotalZonesModal(true)}
          onOpenHighRiskZones={() => setShowHighRiskModal(true)}
          onOpenBlockedRoads={() => setShowBlockedRoadsModal(true)}
          onOpenActiveAlerts={() => setShowActiveAlertsModal(true)}
        />

        {/* 3-Column Operations Layout */}
        <div className="flex-1 grid grid-cols-12 gap-2.5 min-h-0 overflow-hidden">
          {/* Left Column: Zone Selection Sidebar & Road Admin Controls */}
          <div className="col-span-3 bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-xl p-2.5 flex flex-col min-h-0 overflow-hidden shadow-2xl">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-1.5 pb-1 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <span>{t.zonesList} ({zones.length})</span>
              <span className="text-[9px] text-cyan-400 font-mono font-medium">Interactive Radar</span>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
              {zones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <button
                    key={`side-zone-${zone.id}`}
                    onClick={() => setSelectedZone(zone)}
                    className={`w-full text-left p-2 rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/80 border-l-4 border-l-cyan-400 shadow-[0_4px_15px_rgba(6,182,212,0.15)] translate-x-0.5'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[11px] text-slate-100 truncate pr-1">{zone.name}</span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${getBadgeColor(zone.current_risk_level)}`}>
                        {zone.current_risk_level}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span className="truncate pr-1">{zone.district}</span>
                      <span className="font-mono text-cyan-300 font-semibold shrink-0">{(zone.current_risk_score * 100).toFixed(0)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Read-Only Arterial Road Connectivity Status Display */}
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col h-36 shrink-0 min-h-0">
              <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between shrink-0">
                <span>Arterial Roads</span>
                <span className="text-[8px] bg-slate-950/80 text-cyan-400 border border-slate-800 px-1.5 py-0.5 rounded-full font-mono">
                  Live
                </span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                {roads.map((road) => (
                  <div key={`read-road-${road.id}`} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-[10px]">
                    <div className="truncate max-w-[120px]">
                      <p className="font-semibold text-slate-200 truncate">{road.name}</p>
                      <p className="text-[8px] text-slate-500 truncate">{road.zone_name}</p>
                    </div>

                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                      road.connectivity_status === 'blocked'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse'
                        : road.connectivity_status === 'restricted'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {road.connectivity_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column: GIS Leaflet Map */}
          <div className="col-span-6 bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-xl p-1.5 flex flex-col min-h-0 overflow-hidden shadow-2xl">
            <Map
              zones={zones}
              roads={roads}
              reports={reports}
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
            />
          </div>

          {/* Right Column: Dedicated Analytics & 72h Trend Graph (100% Spacious Visibility) */}
          <div className="col-span-3 flex flex-col gap-2.5 min-h-0 overflow-hidden">
            {/* Selected Zone Risk Analytics Card */}
            <div className="flex-[1.3] bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-xl p-2.5 flex flex-col min-h-[240px] overflow-hidden shadow-2xl">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 border-b border-slate-800/80 pb-1.5 flex items-center justify-between shrink-0">
                <span>{t.selectedZoneDetails}</span>
                <span className="text-[9px] text-cyan-400 font-mono font-medium">GIS Radar Analytics</span>
              </h3>

              {selectedZone ? (
                <div className="flex-1 flex flex-col gap-1.5 mt-1.5 text-xs min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 shrink-0">
                    <div>
                      <span className="font-bold text-xs text-slate-100 block">{selectedZone.name}</span>
                      <span className="text-[10px] text-slate-400">{selectedZone.district}, {selectedZone.state}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${getBadgeColor(selectedZone.current_risk_level)}`}>
                      {selectedZone.current_risk_level} Risk ({(selectedZone.current_risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 shrink-0">
                    <div><span className="text-slate-400">{t.slope}:</span> <strong className="text-slate-100 font-mono">{selectedZone.terrain_slope_deg}°</strong></div>
                    <div><span className="text-slate-400">{t.soil}:</span> <strong className="text-slate-100">{selectedZone.soil_type}</strong></div>
                    <div><span className="text-slate-400">{t.history}:</span> <strong className="text-slate-100">{selectedZone.historical_landslide_count} events</strong></div>
                    <div><span className="text-slate-400">{t.rainfall24h}:</span> <strong className="text-cyan-400 font-mono font-bold">{selectedZone.latest_rainfall_mm} mm</strong></div>
                  </div>

                  <div className="flex-1 min-h-[80px] flex flex-col pt-0.5 overflow-hidden">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 shrink-0 flex items-center gap-1">
                      <span>⚠️</span> {t.contributingFactors}
                    </p>
                    <ul className="flex-1 list-disc list-inside text-[11px] text-amber-200/90 space-y-1 bg-slate-950/70 p-2 rounded-lg border border-amber-900/40 overflow-y-auto font-medium shadow-inner">
                      {selectedZone.contributing_factors && selectedZone.contributing_factors.length > 0 ? (
                        selectedZone.contributing_factors.map((factor, idx) => (
                          <li key={`factor-${idx}`} className="leading-snug">{factor}</li>
                        ))
                      ) : (
                        <li className="list-none text-slate-400 italic text-[10px]">No critical risk triggers detected.</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-8">Select a zone on the map or sidebar.</p>
              )}
            </div>

            {/* 72h Rain & Risk Trend Recharts */}
            {selectedZone && (
              <div className="flex-1 min-h-[160px] overflow-hidden">
                <RiskChart history={riskHistory} zoneName={selectedZone.name} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 1. Total Monitoring Zones Modal */}
      {showTotalZonesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">All Monitoring Zones Directory ({zones.length})</h3>
                  <p className="text-[11px] text-slate-400">Complete list of high-risk mountain terrain monitoring sectors</p>
                </div>
              </div>
              <button
                onClick={() => setShowTotalZonesModal(false)}
                className="text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-slate-950/60 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {zones.map((zone) => (
                  <div
                    key={`modal-z-${zone.id}`}
                    onClick={() => { setSelectedZone(zone); setShowTotalZonesModal(false); }}
                    className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/90 hover:border-sky-500/80 hover:bg-slate-800/90 transition cursor-pointer space-y-1.5 shadow-md group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 group-hover:text-sky-300 transition text-sm">{zone.name}</span>
                      <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getBadgeColor(zone.current_risk_level)}`}>
                        {zone.current_risk_level}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{zone.district}, {zone.state}</p>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 font-mono">
                      <div>Slope: <strong className="text-slate-100">{zone.terrain_slope_deg}°</strong></div>
                      <div>Risk: <strong className="text-cyan-400">{(zone.current_risk_score * 100).toFixed(0)}%</strong></div>
                      <div>Soil: <strong className="text-slate-100">{zone.soil_type}</strong></div>
                      <div>24h Rain: <strong className="text-cyan-300">{zone.latest_rainfall_mm}mm</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. High/Severe Risk Zones Modal */}
      {showHighRiskModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 animate-pulse">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    High & Severe Hazard Risk Sectors
                    <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-mono uppercase">
                      {zones.filter(z => z.current_risk_level === 'high' || z.current_risk_level === 'severe').length} Critical
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Zones currently exceeding critical landslide failure risk thresholds</p>
                </div>
              </div>
              <button
                onClick={() => setShowHighRiskModal(false)}
                className="text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-950/60 text-xs">
              {zones.filter(z => z.current_risk_level === 'high' || z.current_risk_level === 'severe').length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No high or severe risk landslide zones detected at this moment.
                </div>
              ) : (
                zones.filter(z => z.current_risk_level === 'high' || z.current_risk_level === 'severe').map((zone) => (
                  <div
                    key={`modal-hr-${zone.id}`}
                    onClick={() => { setSelectedZone(zone); setShowHighRiskModal(false); }}
                    className="p-3.5 rounded-xl border border-rose-800/80 bg-rose-950/20 hover:bg-rose-950/30 transition cursor-pointer space-y-2 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-slate-100 block">{zone.name}</span>
                        <span className="text-xs text-slate-400">{zone.district}, {zone.state}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${getBadgeColor(zone.current_risk_level)}`}>
                        {zone.current_risk_level} Risk ({(zone.current_risk_score * 100).toFixed(0)}%)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div><span className="text-slate-400">Slope:</span> <strong className="text-slate-100">{zone.terrain_slope_deg}°</strong></div>
                      <div><span className="text-slate-400">24h Rainfall:</span> <strong className="text-rose-400 font-mono font-bold">{zone.latest_rainfall_mm} mm</strong></div>
                      <div><span className="text-slate-400">Soil:</span> <strong className="text-slate-100">{zone.soil_type}</strong></div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contributing Triggers:</p>
                      <ul className="list-disc list-inside text-xs text-amber-300 space-y-0.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 font-medium">
                        {zone.contributing_factors.map((f, i) => (
                          <li key={`hrf-${i}`}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Arterial Road Network & Blocked Highways Modal */}
      {showBlockedRoadsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    Arterial Road Network Status ({roads.length} Routes)
                    <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-mono uppercase">
                      {roads.filter(r => r.connectivity_status === 'blocked').length} Blocked
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Live arterial road connectivity & highway status overview</p>
                </div>
              </div>
              <button
                onClick={() => setShowBlockedRoadsModal(false)}
                className="text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-slate-950/60 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roads.map((road) => (
                  <div key={`modal-road-${road.id}`} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2 shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{road.name}</h4>
                        <p className="text-xs text-slate-400">Zone: {road.zone_name}</p>
                      </div>

                      <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        road.connectivity_status === 'blocked'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse'
                          : road.connectivity_status === 'restricted'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {road.connectivity_status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <span>Last Update: {new Date(road.last_updated).toLocaleTimeString()}</span>
                      <span className="text-[9px] text-slate-500 font-mono italic">
                        Status Managed in Admin Panel
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Alerts Stream Modal (Triggered by Active Alerts KPI Button) */}
      {showActiveAlertsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/40 animate-pulse">
                  <AlertCircle size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    Live Active Alerts Stream
                    <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-mono uppercase">
                      {alerts.filter(a => !a.acknowledged).length} Unacknowledged
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Real-time hazard notifications & emergency broadcasts</p>
                </div>
              </div>
              <button
                onClick={() => setShowActiveAlertsModal(false)}
                className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden min-h-[350px]">
              <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledgeAlert} lang={lang} />
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Admin Panel Portal */}
      {showAdminPanel && (
        <AdminPanel
          alerts={alerts}
          zones={zones}
          roads={roads}
          reports={reports}
          onClose={() => setShowAdminPanel(false)}
          onRefresh={fetchData}
        />
      )}

      {/* Admin Audit & Field Photo Gallery Modal */}
      {showAdminLog && (
        <AdminNotifications alerts={alerts} zones={zones} reports={reports} onClose={() => setShowAdminLog(false)} onRefresh={fetchData} />
      )}

      {/* Field Photo Upload Modal */}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onSuccess={fetchData}
        />
      )}

      {/* Geofenced Emergency Audio Alarm Siren Modal */}
      {activeEmergencyAlert && (
        <EmergencyAlarmModal
          alert={activeEmergencyAlert}
          onAcknowledge={handleAcknowledgeAlert}
          onClose={() => setActiveEmergencyAlert(null)}
        />
      )}
    </div>
  );
}
