import React, { useState } from 'react';
import axios from 'axios';
import { AlertItem, Zone, FieldReportItem } from '../types';
import { ShieldCheck, Filter, Smartphone, Send, SendHorizontal, AlertOctagon, CheckCircle2, Camera, MapPin, Trash2 } from 'lucide-react';

interface AdminNotificationsProps {
  alerts: AlertItem[];
  zones?: Zone[];
  reports?: FieldReportItem[];
  onClose: () => void;
  onRefresh?: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || `${typeof window !== 'undefined' ? window.location.protocol : 'http:'}//${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000`;

export const AdminNotifications: React.FC<AdminNotificationsProps> = ({ alerts, zones = [], reports = [], onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'log' | 'reports'>('log');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  
  const handleClearLogs = async () => {
    if (window.confirm("Are you sure you want to clear all SMS audit logs from the database?")) {
      try {
        await axios.delete(`${API_BASE}/api/alerts`);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error("Failed to clear audit logs:", err);
      }
    }
  };

  const filtered = alerts.filter(a => {
    if (filterLang !== 'all' && a.language !== filterLang) return false;
    if (filterChannel !== 'all' && a.channel !== filterChannel) return false;
    return true;
  });

  const handleUpdateReportStatus = async (reportId: number, newStatus: string) => {
    try {
      await axios.patch(`${API_BASE}/api/reports/${reportId}`, { status: newStatus });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to update report status:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 z-[99999]">
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl w-full max-w-4xl min-h-[460px] max-h-[85vh] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">Disaster Response Alert & SMS Audit Log</h2>
              <p className="text-[11px] text-slate-400">Automated System Audits & Field Photo Reports Archive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition"
          >
            Close
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950 px-4 pt-2 border-b border-slate-800 flex gap-2 text-xs">
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === 'log'
                ? 'border-emerald-400 text-emerald-400 bg-slate-900/40 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            SMS Audit Log ({alerts.length})
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'border-sky-400 text-sky-400 bg-slate-900/40 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera size={13} />
            Field Photos & Reports ({reports.length})
          </button>
        </div>

        {/* TAB 1: SMS AUDIT LOG LIST */}
        {activeTab === 'log' && (
          <>
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Filter size={14} /> Filter Logs:
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Language:</span>
                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 outline-none"
                >
                  <option value="all">All Languages</option>
                  <option value="en">English (en)</option>
                  <option value="as">Assamese (as)</option>
                  <option value="hi">Hindi (hi)</option>
                  <option value="mn">Manipuri (mn)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Channel:</span>
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 outline-none"
                >
                  <option value="all">All Channels</option>
                  <option value="app">App Broadcast</option>
                  <option value="sms">Mock SMS</option>
                </select>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <span className="text-slate-400 font-mono text-[11px]">
                  Showing {filtered.length} of {alerts.length} logs
                </span>
                {alerts.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2.5 py-1 rounded text-xs font-semibold transition shadow-sm"
                  >
                    <Trash2 size={13} /> Clear All Audit Logs
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-950/60">
              {filtered.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
                  <ShieldCheck size={32} className="text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-400">No audit log records found.</p>
                  <p className="text-[11px] text-slate-500">Logs will be generated automatically during risk escalations or manual emergency broadcasts.</p>
                </div>
              ) : (
                filtered.map((item) => (
                <div key={`audit-${item.id}`} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
                      <Smartphone size={13} /> SMS SIMULATION ID: #{item.id}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(item.sent_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium text-slate-100 text-xs mb-2 leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">Zone: {item.zone_name}</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">Lang: {item.language}</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">Channel: {item.channel}</span>
                    <span className={`ml-auto font-bold uppercase px-2 py-0.5 rounded border ${
                      item.severity === 'severe' 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}>
                      {item.severity} Risk
                    </span>
                  </div>
                </div>
              )))}
            </div>
          </>
        )}

        {/* TAB 2: MANUAL EMERGENCY SMS BROADCAST CONSOLE */}
        {activeTab === 'broadcast' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/80 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h3 className="font-bold text-sm text-rose-400 mb-1 flex items-center gap-2">
                <AlertOctagon size={18} />
                Manual Disaster Admin Emergency Broadcast
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Use this console to compose and dispatch instant emergency SMS text alerts directly to field officers, citizens, or target mobile phone numbers.
              </p>
            </div>

            {broadcastSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} className="text-emerald-400" />
                {broadcastSuccess}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Monitoring Zone</label>
                <select
                  value={targetZoneId}
                  onChange={(e) => setTargetZoneId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 font-medium outline-none"
                >
                  {zones.map(z => (
                    <option key={`opt-z-${z.id}`} value={z.id}>{z.name} ({z.district}, {z.state})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Recipient Mobile Number</label>
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Language Code</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 font-medium outline-none"
                >
                  <option value="en">English (en)</option>
                  <option value="as">Assamese (as - অসমীয়া)</option>
                  <option value="hi">Hindi (hi - हिंदी)</option>
                  <option value="mn">Manipuri (mn)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Severity Level</label>
                <select
                  value={targetSeverity}
                  onChange={(e) => setTargetSeverity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 font-medium outline-none"
                >
                  <option value="severe">SEVERE Hazard (Critical Red)</option>
                  <option value="high">HIGH Hazard (Warning Orange)</option>
                  <option value="moderate">MODERATE Caution (Yellow)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">Emergency SMS Message Text</label>
                <span className="text-[10px] text-slate-500">Quick Templates:</span>
              </div>

              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <button
                  onClick={() => setTemplate("EVACUATION ORDER: Severe slope failure risk detected. Leave low-lying mountain paths immediately.")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] px-2.5 py-1 rounded"
                >
                  Evacuation Order
                </button>
                <button
                  onClick={() => setTemplate("ROAD CLOSURE NOTICE: Highway blocked due to heavy debris collapse. Seek alternative routes.")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] px-2.5 py-1 rounded"
                >
                  Road Closure Notice
                </button>
                <button
                  onClick={() => setTemplate("HEAVY RAINFALL ADVISORY: 120mm rain recorded. High saturation on steep slopes.")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] px-2.5 py-1 rounded"
                >
                  Rainfall Advisory
                </button>
              </div>

              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-xs outline-none font-sans"
              />
            </div>

            <button
              onClick={handleSendManualBroadcast}
              disabled={isSending || !customMessage.trim()}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 text-sm shadow-xl transition"
            >
              <SendHorizontal size={18} />
              {isSending ? "DISPATCHING EMERGENCY SMS ALERT..." : "DISPATCH MANUAL EMERGENCY SMS ALERT NOW"}
            </button>
          </div>
        )}

        {/* TAB 3: FIELD REPORTS & UPLOADED PHOTOS GALLERY */}
        {activeTab === 'reports' && (
          <div className="p-4 flex-1 overflow-y-auto bg-slate-950 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Uploaded Geotagged Field Reports ({reports.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Click map markers or view full captures below
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No field reports uploaded yet. Click <strong>Upload Photo / Field Report</strong> in the header bar to submit one!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reports.map((report) => (
                  <div
                    key={`report-gallery-${report.id}`}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          report.reporter_type === 'field_officer'
                            ? 'bg-sky-950 text-sky-400 border-sky-800'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {report.reporter_type === 'field_officer' ? '🛡️ Officer' : '🏡 Citizen'}
                        </span>
                        <span className="font-semibold text-xs text-slate-200">{report.reporter_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium line-clamp-2">
                      {report.description}
                    </p>

                    {report.photo_url && (
                      <div className="relative rounded overflow-hidden border border-slate-800 bg-slate-950 group">
                        <img
                          src={`${API_BASE}${report.photo_url}`}
                          alt="Field report capture"
                          className="w-full h-36 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2 flex items-center justify-between text-[10px] text-slate-300 font-mono">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-rose-400" />
                            {report.latitude.toFixed(3)}°, {report.longitude.toFixed(3)}°
                          </span>
                          <span className="text-emerald-400 font-semibold">{report.zone_name}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span>Status:</span>
                        <span className={`font-bold uppercase px-2.5 py-0.5 rounded text-[10px] ${
                          report.status === 'verified'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : report.status === 'dismissed'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                        }`}>
                          {report.status === 'verified' ? '✓ VERIFIED BY ADMIN' : report.status === 'dismissed' ? '✕ DISMISSED BY ADMIN' : 'PENDING REVIEW'}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono">Matched Zone #{report.zone_id || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
