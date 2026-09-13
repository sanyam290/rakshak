import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Activity, 
  Radio, 
  Volume2, 
  MessageSquare, 
  MapPin, 
  ChevronRight, 
  ArrowRight, 
  Globe, 
  Lock, 
  BarChart3, 
  Zap, 
  FileText,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  Cpu,
  UserCheck
} from 'lucide-react';
import { Language } from '../i18n';

interface LandingPageProps {
  onLaunchDashboard: () => void;
  onOpenAdminPanel: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

// 8 High-Risk Planetary/Sector Nodes representing NER Disaster Zones
const ORBITAL_SECTORS = [
  { id: 1, name: "Cherrapunji (Sohra) Ridge", state: "Meghalaya", risk: "0.88", level: "severe", color: "#f43f5e", distance: 130, angle: 0, slope: 38.5, rain: 142.5 },
  { id: 2, name: "Shillong Bypass Pass", state: "Meghalaya", risk: "0.62", level: "high", color: "#f59e0b", distance: 180, angle: 72, slope: 32.0, rain: 88.0 },
  { id: 3, name: "Lunglei South Ridge", state: "Mizoram", risk: "0.91", level: "severe", color: "#e11d48", distance: 230, angle: 144, slope: 41.2, rain: 165.0 },
  { id: 4, name: "Aizawl North Ridge", state: "Mizoram", risk: "0.58", level: "high", color: "#f59e0b", distance: 140, angle: 216, slope: 36.4, rain: 74.2 },
  { id: 5, name: "Imphal-Jiribam Highway", state: "Manipur", risk: "0.79", level: "severe", color: "#f43f5e", distance: 280, angle: 288, slope: 35.8, rain: 118.4 },
  { id: 6, name: "Haflong Hill Sector", state: "Assam", risk: "0.85", level: "severe", color: "#e11d48", distance: 190, angle: 108, slope: 39.0, rain: 130.0 },
  { id: 7, name: "Senapati Hill Pass", state: "Manipur", risk: "0.28", level: "low", color: "#10b981", distance: 260, angle: 250, slope: 31.5, rain: 22.1 },
  { id: 8, name: "Kamakhya Foothill Zone", state: "Assam", risk: "0.22", level: "low", color: "#10b981", distance: 110, angle: 320, slope: 27.5, rain: 18.0 }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchDashboard,
  onOpenAdminPanel,
  lang,
  onLanguageChange
}) => {
  const [selectedSector, setSelectedSector] = useState(ORBITAL_SECTORS[0]);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [rotationOffset, setRotationOffset] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Starfield particle background canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Create 180 star particles
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.3,
      speed: Math.random() * 0.4 + 0.1,
      opacity: Math.random() * 0.8 + 0.2,
      glowColor: Math.random() > 0.6 ? '#06b6d4' : Math.random() > 0.3 ? '#3b82f6' : '#ffffff'
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint nebula ambient radial gradient
      const bgGlow = ctx.createRadialGradient(width / 2, height / 2.5, 50, width / 2, height / 2.5, width * 0.7);
      bgGlow.addColorStop(0, 'rgba(14, 165, 233, 0.08)');
      bgGlow.addColorStop(0.5, 'rgba(15, 23, 42, 0.6)');
      bgGlow.addColorStop(1, 'rgba(3, 7, 18, 1)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Render star particles
      stars.forEach((star) => {
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = star.glowColor;
        ctx.globalAlpha = star.opacity;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Continuous Solar Orbital Rotation
  useEffect(() => {
    if (!isRotating) return;
    const interval = setInterval(() => {
      setRotationOffset((prev) => (prev + 0.3) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isRotating]);

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 font-sans overflow-x-hidden relative selection:bg-cyan-500 selection:text-black">
      {/* 1. Dynamic Space Starfield Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Grid Overlay Matrix */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0ea5e908_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e908_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none z-0"></div>

      {/* 2. Solar HUD Header Navigation */}
      <header className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-cyan-900/40 bg-slate-950/60 backdrop-blur-xl">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onLaunchDashboard}>
          <div className="relative p-2.5 bg-cyan-950/80 text-cyan-400 rounded-2xl border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.3)] animate-pulse">
            <Shield size={26} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-wider text-slate-100 font-mono">
                NER-SENTINEL <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">RAKSHAK</span>
              </span>
              <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/80 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest hidden sm:inline-block">
                SOLAR GIS RADAR
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">Space-Grade Landslide Telemetry & Disaster Operations Radar</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs shadow-inner">
            <Globe size={14} className="text-cyan-400" />
            <select
              value={lang}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer font-semibold"
            >
              <option value="en" className="bg-slate-900">EN</option>
              <option value="as" className="bg-slate-900">অসমীয়া</option>
              <option value="hi" className="bg-slate-900">हिंदी</option>
              <option value="mn" className="bg-slate-900">মৈতৈলোন্</option>
            </select>
          </div>

          <button
            onClick={onOpenAdminPanel}
            className="hidden sm:flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-sky-600/70 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg hover:scale-105"
          >
            <UserCheck size={14} className="text-sky-400" />
            ADMIN PORTAL
          </button>

          <button
            onClick={onLaunchDashboard}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 cursor-pointer"
          >
            <Activity size={15} className="animate-spin" />
            ENTER LIVE DASHBOARD
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* 3. Hero Solar Orbital Radar Experience */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[calc(100vh-80px)]">
        
        {/* Left Column: Mission Description & Telemetry HUD */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 bg-cyan-950/80 border border-cyan-500/50 px-3.5 py-1.5 rounded-full text-xs text-cyan-300 font-mono shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Sparkles size={14} className="text-cyan-400 animate-pulse" />
            <span>SOLAR SYSTEM GIS RISK MONITORING SYSTEM</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight leading-[1.1]">
            Solar Orbital <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              Landslide Radar.
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-normal">
            Autonomous multi-planetary risk telemetry monitoring mountain slope deformation, 72h monsoon saturation, geofenced acoustic sirens, and real-time disaster response routing for Northeast India.
          </p>

          {/* Interactive Launch Action */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3.5">
            <button
              onClick={onLaunchDashboard}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black px-7 py-4 rounded-2xl text-sm transition-all shadow-[0_0_35px_rgba(6,182,212,0.45)] hover:scale-105 cursor-pointer group"
            >
              <Activity size={18} />
              <span>LAUNCH LIVE COMMAND DASHBOARD</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setIsRotating(!isRotating)}
              className="flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-800/80 px-5 py-4 rounded-2xl text-xs font-mono transition-all hover:scale-105 cursor-pointer"
            >
              {isRotating ? <Pause size={14} /> : <Play size={14} />}
              <span>{isRotating ? "PAUSE ORBIT" : "START ORBIT"}</span>
            </button>
          </div>

          {/* Selected Orbital Node Telemetry HUD Card */}
          <div className="hud-card p-4 rounded-2xl border border-cyan-500/40 relative overflow-hidden mt-6">
            <div className="absolute top-2 right-2 text-[9px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded">
              ORBITAL NODE #{selectedSector.id}
            </div>

            <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider mb-1">Selected Orbital Sector</p>
            <h3 className="text-lg font-extrabold text-slate-100 flex items-center justify-between">
              <span>{selectedSector.name}</span>
              <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border border-current font-bold`} style={{ color: selectedSector.color }}>
                {selectedSector.level} RISK
              </span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">{selectedSector.state} Disaster Sector</p>

            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">Failure Risk</span>
                <span className="font-bold text-sm" style={{ color: selectedSector.color }}>{(Number(selectedSector.risk) * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Terrain Slope</span>
                <span className="font-bold text-sm text-slate-200">{selectedSector.slope}°</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">24h Rainfall</span>
                <span className="font-bold text-sm text-cyan-400">{selectedSector.rain}mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Interactive Solar System Orbital Canvas Component */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[460px]">
          
          {/* Orbital Solar Canvas Graphics Container */}
          <div className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] flex items-center justify-center">
            
            {/* Outer Atmospheric Glow */}
            <div className="absolute inset-0 rounded-full bg-cyan-500/5 blur-3xl animate-pulse-glow pointer-events-none"></div>

            {/* Orbit Ring 1 (Inner Orbit) */}
            <div className="absolute w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-full border border-cyan-500/30 border-dashed animate-spin-orbit-fast pointer-events-none"></div>

            {/* Orbit Ring 2 (Middle Orbit) */}
            <div className="absolute w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full border border-slate-700/50 pointer-events-none"></div>

            {/* Orbit Ring 3 (Outer Orbit) */}
            <div className="absolute w-[330px] h-[330px] sm:w-[420px] sm:h-[420px] rounded-full border border-cyan-800/40 border-dotted animate-reverse-spin pointer-events-none"></div>

            {/* Central Sun / Core GIS Landslide Sentinel Engine */}
            <div 
              onClick={onLaunchDashboard}
              className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-cyan-400 via-teal-500 to-emerald-600 p-1 cursor-pointer shadow-[0_0_50px_rgba(6,182,212,0.6)] hover:scale-110 transition-transform duration-300 group flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full bg-slate-950/90 flex flex-col items-center justify-center text-center p-2 backdrop-blur-md">
                <Shield size={24} className="text-cyan-400 animate-pulse mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-mono text-[9px] font-black text-slate-100 tracking-wider">RAKSHAK</span>
                <span className="font-mono text-[7px] text-cyan-400 font-semibold">CORE RADAR</span>
              </div>
            </div>

            {/* Revolving Orbital Planet / Sector Nodes */}
            {ORBITAL_SECTORS.map((sector) => {
              const currentAngleRad = ((sector.angle + rotationOffset) * Math.PI) / 180;
              const radius = sector.distance * (window.innerWidth < 640 ? 0.65 : 0.85);
              const x = Math.cos(currentAngleRad) * radius;
              const y = Math.sin(currentAngleRad) * radius;

              const isSelected = selectedSector.id === sector.id;

              return (
                <div
                  key={`orbit-node-${sector.id}`}
                  onClick={() => setSelectedSector(sector)}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    transition: isRotating ? 'none' : 'transform 0.5s ease-out'
                  }}
                  className="absolute z-30 cursor-pointer group"
                >
                  {/* Planet Node Orb */}
                  <div className={`relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-125' : 'hover:scale-110'}`}>
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-white/20 font-mono text-[10px] font-bold text-slate-950"
                      style={{ 
                        backgroundColor: sector.color,
                        boxShadow: `0 0 20px ${sector.color}`
                      }}
                    >
                      {sector.id}
                    </div>

                    {/* Hover Telemetry Label Pill */}
                    <div className={`absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-mono border backdrop-blur-md transition-all ${
                      isSelected 
                        ? 'bg-slate-950 text-cyan-300 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                        : 'bg-slate-950/80 text-slate-300 border-slate-800 opacity-80 group-hover:opacity-100'
                    }`}>
                      {sector.name.split(' ')[0]} ({(Number(sector.risk)*100).toFixed(0)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Solar Controls & Orbital Sector Selector Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-lg">
            {ORBITAL_SECTORS.map((sector) => (
              <button
                key={`btn-sector-${sector.id}`}
                onClick={() => setSelectedSector(sector)}
                className={`px-3 py-1 rounded-full text-[11px] font-mono border transition-all cursor-pointer ${
                  selectedSector.id === sector.id
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                #{sector.id} {sector.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Solar Ecosystem Operations Features */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-cyan-950/60">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-mono mb-2">
            <Cpu size={14} />
            <span>DEEP-SPACE DISASTER AUTOMATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
            Solar Radar Architecture & Capabilities
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Engineered specifically for North-Eastern hill terrain, high monsoon precipitation, and remote arterial road networks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="hud-card hud-card-hover p-6 rounded-2xl text-left relative overflow-hidden group">
            <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center mb-4 border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <Radio size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100 mb-2">GIS Telemetry & Risk Radar</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interactive Leaflet GIS map visualizing hill slope angles, 24h & 72h rainfall accumulation, soil saturation levels, and historical landslide event markers.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="hud-card hud-card-hover p-6 rounded-2xl text-left relative overflow-hidden group">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4 border border-amber-500/30 group-hover:scale-110 transition-transform">
              <Volume2 size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100 mb-2">Geofenced Emergency Siren</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatic audio alarm triggered when mobile phone users enter high or severe landslide hazard sectors, delivering high-decibel evacuation directives.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="hud-card hud-card-hover p-6 rounded-2xl text-left relative overflow-hidden group">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center mb-4 border border-rose-500/30 group-hover:scale-110 transition-transform">
              <MessageSquare size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100 mb-2">Multilingual SMS Dispatch</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Direct integration with Twilio/Fast2SMS gateway to broadcast localized emergency warnings in English, Assamese, Hindi, and Manipuri to field teams and citizens.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="hud-card hud-card-hover p-6 rounded-2xl text-left relative overflow-hidden group">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <MapPin size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100 mb-2">Arterial Highway Status</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Live connectivity monitoring across national highways (NH-54, NH-37, SH-5). Status updates (OPEN, RESTRICTED, BLOCKED) are managed strictly in the Admin Panel.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="hud-card hud-card-hover p-6 rounded-2xl text-left relative overflow-hidden group">
            <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center mb-4 border border-sky-500/30 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100 mb-2">Citizen Field Incident Reports</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Allows citizens and field officers to upload geotagged photos and incident reports directly from disaster sites for administrative approval and verification.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="hud-card hud-card-hover p-6 rounded-2xl text-left relative overflow-hidden group">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/30 group-hover:scale-110 transition-transform">
              <BarChart3 size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100 mb-2">72-Hour Precipitation Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Recharts dual-axis visualization comparing precipitation buildup against XGBoost predicted failure risk scores for early decision-making.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Warp Drive Solar CTA Footer Banner */}
      <section className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 my-12">
        <div className="hud-card p-8 sm:p-12 rounded-3xl text-center border border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.2)]">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-slate-100">
              Ready to Access Orbital GIS Radar?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Transition directly into the NER-Sentinel Live Command Operations Dashboard to monitor real-time hazard maps, risk analytics, and emergency alerts.
            </p>
            <div className="pt-4 flex justify-center">
              <button
                onClick={onLaunchDashboard}
                className="flex items-center gap-3 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black px-9 py-4.5 rounded-2xl text-sm transition-all shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 cursor-pointer"
              >
                <Activity size={20} />
                ENTER LIVE COMMAND DASHBOARD NOW
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-slate-800/80 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-cyan-400" />
            <span className="text-slate-300 font-bold">NER-SENTINEL RAKSHAK</span>
            <span>© {new Date().getFullYear()} Solar GIS Disaster Radar System</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <button onClick={onLaunchDashboard} className="hover:text-cyan-400 transition">Live Dashboard</button>
            <span>•</span>
            <button onClick={onOpenAdminPanel} className="hover:text-cyan-400 transition">Admin Portal</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
