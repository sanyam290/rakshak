import React from 'react';
import { AlertTriangle, MapPin, Route, Bell } from 'lucide-react';
import { Zone, RoadItem, AlertItem } from '../types';
import { TRANSLATIONS, Language } from '../i18n';

interface KpiBarProps {
  zones: Zone[];
  roads: RoadItem[];
  alerts: AlertItem[];
  lang: Language;
  onOpenTotalZones?: () => void;
  onOpenHighRiskZones?: () => void;
  onOpenBlockedRoads?: () => void;
  onOpenActiveAlerts?: () => void;
}

export const KpiBar: React.FC<KpiBarProps> = ({
  zones,
  roads,
  alerts,
  lang,
  onOpenTotalZones,
  onOpenHighRiskZones,
  onOpenBlockedRoads,
  onOpenActiveAlerts
}) => {
  const t = TRANSLATIONS[lang];

  const highRiskCount = zones.filter(z => z.current_risk_level === 'high' || z.current_risk_level === 'severe').length;
  const blockedRoadsCount = roads.filter(r => r.connectivity_status === 'blocked').length;
  const unackAlertsCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
      {/* 1. TOTAL ZONES BUTTON CARD */}
      <button
        onClick={onOpenTotalZones}
        className="text-left bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-sky-500/60 rounded-xl p-2 sm:px-3 sm:py-2 flex items-center justify-between shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] group"
      >
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-wider group-hover:text-sky-300 transition truncate">{t.totalZones}</p>
          <p className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-1 sm:gap-1.5">
            {zones.length}
            <span className="text-[8px] sm:text-[9px] font-normal text-slate-400 group-hover:text-sky-300 underline decoration-slate-600 transition truncate hidden xs:inline">View all</span>
          </p>
        </div>
        <div className="p-1 sm:p-1.5 bg-slate-800/80 text-sky-400 rounded-lg border border-slate-700/50 group-hover:border-sky-500/50 transition shrink-0">
          <MapPin size={14} className="sm:w-4 sm:h-4" />
        </div>
      </button>

      {/* 2. HIGH/SEVERE RISK BUTTON CARD */}
      <button
        onClick={onOpenHighRiskZones}
        className={`text-left border rounded-xl p-2 sm:px-3 sm:py-2 flex items-center justify-between shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] group ${
          highRiskCount > 0
            ? 'bg-gradient-to-r from-amber-950/40 to-slate-900/90 border-amber-600/60 hover:border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
            : 'bg-slate-900/80 border-slate-800/80 hover:border-amber-500/60'
        }`}
      >
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-wider group-hover:text-amber-300 transition truncate">{t.highRiskZones}</p>
          <p className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-1 sm:gap-1.5">
            {highRiskCount}
            <span className="text-[8px] sm:text-[9px] font-normal text-slate-400 group-hover:text-amber-300 underline decoration-slate-600 transition truncate hidden xs:inline">View critical</span>
          </p>
        </div>
        <div className={`p-1 sm:p-1.5 rounded-lg border transition shrink-0 ${
          highRiskCount > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' : 'bg-slate-800/80 text-amber-400 border-slate-700/50'
        }`}>
          <AlertTriangle size={14} className="sm:w-4 sm:h-4" />
        </div>
      </button>

      {/* 3. BLOCKED ROADS BUTTON CARD */}
      <button
        onClick={onOpenBlockedRoads}
        className={`text-left border rounded-xl p-2 sm:px-3 sm:py-2 flex items-center justify-between shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] group ${
          blockedRoadsCount > 0
            ? 'bg-gradient-to-r from-rose-950/40 to-slate-900/90 border-rose-600/60 hover:border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
            : 'bg-slate-900/80 border-slate-800/80 hover:border-rose-500/60'
        }`}
      >
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-wider group-hover:text-rose-300 transition truncate">{t.blockedRoads}</p>
          <p className="text-base sm:text-lg font-bold text-rose-400 flex items-center gap-1 sm:gap-1.5">
            {blockedRoadsCount}
            <span className="text-[8px] sm:text-[9px] font-normal text-slate-400 group-hover:text-rose-300 underline decoration-slate-600 transition truncate hidden xs:inline">Status</span>
          </p>
        </div>
        <div className={`p-1 sm:p-1.5 rounded-lg border transition shrink-0 ${
          blockedRoadsCount > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' : 'bg-slate-800/80 text-rose-400 border-slate-700/50'
        }`}>
          <Route size={14} className="sm:w-4 sm:h-4" />
        </div>
      </button>

      {/* 4. ACTIVE ALERTS BUTTON CARD */}
      <button
        onClick={onOpenActiveAlerts}
        className={`text-left border rounded-xl p-2 sm:px-3 sm:py-2 flex items-center justify-between shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] group ${
          unackAlertsCount > 0
            ? 'bg-gradient-to-r from-rose-950/50 to-slate-900/90 border-rose-600/70 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
            : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
        }`}
      >
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center gap-1">
            <p className="text-[9px] sm:text-[10px] text-slate-300 font-bold uppercase tracking-wider group-hover:text-emerald-300 transition truncate">{t.activeAlerts}</p>
            {unackAlertsCount > 0 && (
              <span className="text-[7px] sm:text-[8px] bg-rose-500 text-white font-bold px-1 py-0.2 rounded-full animate-pulse shrink-0">
                LIVE
              </span>
            )}
          </div>
          <p className="text-base sm:text-lg font-bold text-emerald-400 flex items-center gap-1 sm:gap-1.5">
            {unackAlertsCount}
            <span className="text-[8px] sm:text-[9px] font-normal text-slate-400 group-hover:text-emerald-300 underline decoration-slate-600 transition truncate hidden xs:inline">Stream</span>
          </p>
        </div>
        <div className={`p-1 sm:p-1.5 rounded-lg border transition shrink-0 ${
          unackAlertsCount > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-bounce' : 'bg-slate-800/80 text-emerald-400 border-slate-700/50'
        }`}>
          <Bell size={14} className="sm:w-4 sm:h-4" />
        </div>
      </button>
    </div>
  );
};
