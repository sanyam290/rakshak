import React, { useEffect } from 'react';
import { Volume2, VolumeX, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import { alarmSynthesizer } from '../utils/alarmSound';
import { AlertItem } from '../types';

interface EmergencyAlarmModalProps {
  alert: AlertItem;
  onAcknowledge: (alertId: number) => void;
  onClose: () => void;
}

export const EmergencyAlarmModal: React.FC<EmergencyAlarmModalProps> = ({ alert, onAcknowledge, onClose }) => {
  useEffect(() => {
    // Automatically trigger piercing emergency alarm siren audio
    alarmSynthesizer.startAlarm();

    return () => {
      alarmSynthesizer.stopAlarm();
    };
  }, []);

  const toggleSound = () => {
    if (alarmSynthesizer.getIsPlaying()) {
      alarmSynthesizer.stopAlarm();
    } else {
      alarmSynthesizer.startAlarm();
    }
  };

  const handleAcknowledge = () => {
    alarmSynthesizer.stopAlarm();
    onAcknowledge(alert.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-rose-950/80 backdrop-blur-lg flex items-center justify-center p-4 z-[999999] animate-pulse-fast">
      <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-center text-slate-100 flex flex-col items-center">
        {/* Pulsing Hazard Icon */}
        <div className="p-4 bg-rose-600/30 text-rose-400 rounded-full border-2 border-rose-500 mb-4 animate-bounce">
          <ShieldAlert size={48} />
        </div>

        <span className="bg-rose-600 text-white text-xs font-bold uppercase px-3 py-1 rounded-full mb-2 tracking-widest animate-pulse">
          GEOFENCED EMERGENCY ALARM ACTIVE
        </span>

        <h2 className="text-xl font-extrabold text-rose-400 mb-1">
          CRITICAL HAZARD ALARM — {alert.zone_name.toUpperCase()}
        </h2>
        <p className="text-xs text-slate-400 mb-4">District: {alert.district} | Severe Landslide Failure Imminent</p>

        {/* Message Box */}
        <div className="bg-slate-950 border border-rose-900/80 p-4 rounded-xl mb-6 text-left w-full">
          <p className="text-sm font-semibold text-rose-100 leading-relaxed">
            {alert.message}
          </p>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
            <span>Language: <strong className="uppercase">{alert.language}</strong></span>
            <span>Channel: <strong className="uppercase">{alert.channel}</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={toggleSound}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition"
          >
            {alarmSynthesizer.getIsPlaying() ? (
              <>
                <VolumeX size={18} className="text-rose-400" />
                MUTE EMERGENCY SIREN ALARM
              </>
            ) : (
              <>
                <Volume2 size={18} className="text-emerald-400" />
                RESUME EMERGENCY SIREN ALARM
              </>
            )}
          </button>

          <button
            onClick={handleAcknowledge}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-xl font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition"
          >
            <CheckCircle size={20} />
            ACKNOWLEDGE & EVACUATE HAZARD ZONE
          </button>
        </div>
      </div>
    </div>
  );
};
