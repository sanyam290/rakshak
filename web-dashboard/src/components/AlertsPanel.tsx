import React from 'react';
import { Bell, CheckCircle, AlertOctagon } from 'lucide-react';
import { AlertItem } from '../types';
import { TRANSLATIONS, Language } from '../i18n';

interface AlertsPanelProps {
  alerts: AlertItem[];
  onAcknowledge: (alertId: number) => void;
  lang: Language;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onAcknowledge, lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-xl p-2 h-full flex flex-col min-h-0 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-800/80 shrink-0">
        <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <span className="p-0.5 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
            <Bell size={11} />
          </span>
          {t.alertsFeed}
        </h3>
        <span className="text-[8px] bg-slate-950/80 text-cyan-300 border border-slate-800 px-2 py-0.5 rounded-full font-mono">
          {alerts.length} Total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 text-xs pr-0.5 min-h-0">
        {alerts.length === 0 ? (
          <div className="text-center text-slate-500 py-4 text-[10px] font-medium">No active hazard alerts.</div>
        ) : (
          alerts.map((alert) => {
            const isSevere = alert.severity === 'severe';
            return (
              <div
                key={`alert-${alert.id}`}
                className={`p-2 rounded-lg border text-[10px] transition-all duration-200 ${
                  isSevere
                    ? 'bg-rose-950/40 border-rose-800/70 text-rose-200 shadow-[0_2px_10px_rgba(244,63,94,0.15)]'
                    : 'bg-amber-950/30 border-amber-800/60 text-amber-200 shadow-[0_2px_10px_rgba(245,158,11,0.1)]'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="flex items-center gap-1 truncate pr-1">
                    <AlertOctagon size={12} className={isSevere ? 'text-rose-400 animate-pulse shrink-0' : 'text-amber-400 shrink-0'} />
                    <span className="truncate">{alert.zone_name}</span>
                    <span className="text-slate-400 text-[9px] font-normal truncate">({alert.district})</span>
                  </span>
                  <span className="text-[8px] font-mono text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/60 shrink-0">
                    {new Date(alert.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[10px] leading-snug mb-1 text-slate-200/90 font-medium bg-slate-950/50 p-1.5 rounded border border-slate-800/60">
                  {alert.message}
                </p>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="uppercase font-mono tracking-wider text-slate-400">
                    <strong className="text-slate-200">{alert.language}</strong> | <strong className="text-slate-200">{alert.channel}</strong>
                  </span>
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-2 py-0.5 rounded border border-slate-700 transition text-[9px] cursor-pointer"
                    >
                      {t.acknowledge}
                    </button>
                  ) : (
                    <span className="flex items-center gap-0.5 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded-full text-[8px]">
                      <CheckCircle size={10} /> {t.acknowledged}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
