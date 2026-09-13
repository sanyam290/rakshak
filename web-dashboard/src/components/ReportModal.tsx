import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, MapPin, Upload, X, CheckCircle2, Video, RefreshCw, AlertCircle } from 'lucide-react';

interface ReportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || `${typeof window !== 'undefined' ? window.location.protocol : 'http:'}//${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000`;

export const ReportModal: React.FC<ReportModalProps> = ({ onClose, onSuccess }) => {
  const [reporterType, setReporterType] = useState<'citizen' | 'field_officer'>('citizen');
  const [reporterName, setReporterName] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('25.28');
  const [longitude, setLongitude] = useState<string>('91.70');
  const [description, setDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live Camera WebRTC State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Clean up camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      handleStopCamera();
    }
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      let stream: MediaStream;
      try {
        // Option 1: Try environment camera (mobile back camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (e) {
        // Option 2: Fall back to standard webcam (laptops/desktops)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Could not access camera. Please allow browser camera permissions or choose a photo file below.");
    }
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setIsCameraActive(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `live_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(canvas.toDataURL('image/jpeg'));
          handleStopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleAutoGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(4));
          setLongitude(pos.coords.longitude.toFixed(4));
        },
        (err) => {
          console.warn("Could not get browser GPS:", err);
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('description', description);
      formData.append('reporter_type', reporterType);
      formData.append('reporter_name', reporterName || (reporterType === 'field_officer' ? 'Field Officer' : 'Local Resident'));

      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      const res = await axios.post(`${API_BASE}/api/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMsg(`Report #${res.data.report_id} submitted! Matched to zone: ${res.data.matched_zone_name || 'General Area'}`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        handleStopCamera();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to submit report:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl p-5 text-xs text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-emerald-400" />
            <h3 className="font-bold text-sm">Submit Field Report (Live Photo & Geotag)</h3>
          </div>
          <button onClick={() => { handleStopCamera(); onClose(); }} className="text-slate-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-lg flex items-center gap-2 text-xs">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Role Selection */}
          <div>
            <label className="block text-slate-400 mb-1">Reporter Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReporterType('citizen')}
                className={`py-2 rounded-lg border font-semibold ${
                  reporterType === 'citizen'
                    ? 'bg-sky-950 border-sky-500 text-sky-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Local Citizen / Resident
              </button>
              <button
                type="button"
                onClick={() => setReporterType('field_officer')}
                className={`py-2 rounded-lg border font-semibold ${
                  reporterType === 'field_officer'
                    ? 'bg-sky-950 border-sky-500 text-sky-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Field Officer (NDRF/PWD)
              </button>
            </div>
          </div>

          {/* Reporter Name */}
          <div>
            <label className="block text-slate-400 mb-1">Reporter Name (Optional)</label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="e.g. Officer R. Sharma or Anonymous"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
            />
          </div>

          {/* GPS Location */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Latitude</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-200 outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">Longitude</label>
                <button
                  type="button"
                  onClick={handleAutoGPS}
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                >
                  <MapPin size={10} /> Auto-GPS
                </button>
              </div>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-200 outline-none"
              />
            </div>
          </div>

          {/* Hazard Description */}
          <div>
            <label className="block text-slate-400 mb-1">Hazard Description & Debris Impact</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe road blockage, hill crack, soil erosion..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
              required
            />
          </div>

          {/* Live Camera + File Upload Combined Section */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Photo Attachment (Live Camera or File Upload)</label>
            
            {cameraError && (
              <div className="mb-2 p-2 bg-rose-950/80 border border-rose-800 text-rose-300 rounded text-[11px] flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                {cameraError}
              </div>
            )}

            {/* LIVE CAMERA VIEW */}
            {isCameraActive ? (
              <div className="relative rounded-lg overflow-hidden border border-emerald-500 bg-slate-950 p-2 space-y-2">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && cameraStream && el.srcObject !== cameraStream) {
                      el.srcObject = cameraStream;
                      el.play().catch((e) => console.warn("Video play exception:", e));
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-52 object-cover rounded-lg bg-black border border-emerald-500/60"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-lg animate-pulse"
                  >
                    <Camera size={16} />
                    📸 TAKE LIVE PHOTO SNAPSHOT
                  </button>
                  <button
                    type="button"
                    onClick={handleStopCamera}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel Camera
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              /* PHOTO PREVIEW */
              <div className="relative border border-slate-700 bg-slate-950 rounded-lg p-2">
                <img src={previewUrl} alt="Preview" className="h-40 w-full object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded-md text-[10px] font-bold shadow-md"
                >
                  Remove & Retake Photo
                </button>
              </div>
            ) : (
              /* DUAL ACTION CONTROLS: LIVE CAMERA OR FILE BROWSE */
              <div className="grid grid-cols-2 gap-2 border border-dashed border-slate-700 bg-slate-950 rounded-lg p-4 text-center">
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/80 text-emerald-200 rounded-lg transition"
                >
                  <Video size={22} className="text-emerald-400 animate-pulse" />
                  <span className="font-bold text-xs">📷 Open Live Camera</span>
                  <span className="text-[10px] text-emerald-400/80">Take Live Photo Snapshot</span>
                </button>

                <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 rounded-lg transition">
                  <Upload size={22} className="text-sky-400" />
                  <span className="font-bold text-xs">📁 Browse Image File</span>
                  <span className="text-[10px] text-slate-400">Upload Saved Photo</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs shadow-lg transition mt-4"
          >
            <Camera size={14} />
            {isSubmitting ? "Submitting Geotagged Report..." : "SUBMIT FIELD REPORT NOW"}
          </button>
        </form>
      </div>
    </div>
  );
};
