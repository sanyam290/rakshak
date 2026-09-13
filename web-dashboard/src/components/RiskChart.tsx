import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { RiskHistoryPoint } from '../types';

interface RiskChartProps {
  history: RiskHistoryPoint[];
  zoneName: string;
}

export const RiskChart: React.FC<RiskChartProps> = ({ history, zoneName }) => {
  if (!history || history.length === 0) {
    return (
      <div className="h-full min-h-[180px] flex items-center justify-center text-xs text-slate-500 bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-xl">
        No 72h telemetry trend data available.
      </div>
    );
  }

  const formattedData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    rainfall: h.rainfall_mm,
    risk: Math.round(h.risk_score * 100)
  }));

  return (
    <div className="w-full h-full bg-slate-900/70 backdrop-blur-xl p-3 rounded-xl border border-slate-800/80 shadow-2xl flex flex-col justify-between overflow-hidden">
      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between shrink-0 border-b border-slate-800/80 pb-1.5">
        <span className="truncate pr-1">72h Rain & Risk Trend — {zoneName}</span>
        <span className="text-cyan-400 font-mono text-[9px] bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-full shrink-0 font-medium">3h Interval</span>
      </h4>
      <div className="w-full flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
            <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 9, fill: '#94A3B8' }} interval="preserveStartEnd" />
            <YAxis stroke="#64748B" tick={{ fontSize: 9, fill: '#94A3B8' }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', padding: '8px 12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
              labelStyle={{ color: '#38BDF8', fontWeight: 'bold' }}
            />
            <Area type="monotone" dataKey="risk" name="Risk Score %" stroke="#F43F5E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRisk)" />
            <Area type="monotone" dataKey="rainfall" name="Rainfall mm" stroke="#06B6D4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRain)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
