import { PlanetData } from '../types';
import { PLANETS, SUN_DATA } from '../data';
import { 
  Play, Pause, RotateCcw, Orbit, Info, LayoutGrid, Scale, Maximize2 
} from 'lucide-react';

interface SimulationControlsProps {
  selectedPlanetId: string | null;
  onSelectPlanet: (planet: PlanetData | null) => void;
  timeSpeed: number;
  setTimeSpeed: (speed: number) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  scaleMode: 'visual' | 'realistic';
  setScaleMode: (mode: 'visual' | 'realistic') => void;
  sizeMode: 'visual' | 'realistic';
  setSizeMode: (mode: 'visual' | 'realistic') => void;
  showOrbits: boolean;
  setShowOrbits: (show: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  onResetAngles: () => void;
}

export default function SimulationControls({
  selectedPlanetId,
  onSelectPlanet,
  timeSpeed,
  setTimeSpeed,
  isPaused,
  setIsPaused,
  scaleMode,
  setScaleMode,
  sizeMode,
  setSizeMode,
  showOrbits,
  setShowOrbits,
  showLabels,
  setShowLabels,
  onResetAngles
}: SimulationControlsProps) {

  const handleSpeedQuickSet = (factor: number) => {
    setTimeSpeed(factor);
    setIsPaused(false);
  };

  const handleSelectSun = () => {
    // Pass null or treat sun custom selection in App.tsx
    onSelectPlanet(null); // Deselect planet will automatically focus Sun
  };

  return (
    <div 
      id="simulation-control-card"
      className="bg-white/[0.03] border border-white/20 p-6 rounded-[2rem] shadow-2xl space-y-6 backdrop-blur-2xl"
    >
      {/* 1. Header with simulation control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-base font-light tracking-tight text-white font-sans flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-emerald-300" />
            <span>Quantum Time Orchestration</span>
          </h3>
          <p className="text-[10px] font-mono opacity-50 tracking-wide">
            ORBITAL CORRELATION RUNTIME ACCELERATORS
          </p>
        </div>

        {/* Time state controls */}
        <div className="flex items-center gap-2">
          {/* Pause / Play */}
          <button
            id="btn-play-pause"
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2.5 px-4 rounded-xl border flex items-center gap-2 text-xs font-mono transition cursor-pointer backdrop-blur-md ${
              isPaused 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25' 
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-emerald-300" />
                <span>Simulate</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-amber-300" />
                <span>Pause</span>
              </>
            )}
          </button>

          {/* Reset angles */}
          <button
            id="btn-reset-time"
            onClick={onResetAngles}
            className="p-2.5 px-4 rounded-xl bg-white/5 border border-white/15 text-gray-300 hover:text-white hover:bg-white/10 transition text-xs font-mono flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
            title="Reset orbits to standard initial alignment"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Simulation Speed Slider & presets */}
      <div className="space-y-3">
        <div className="flex justify-between text-[11px] font-mono tracking-wider">
          <span className="opacity-55">SIMULATION VELOCITY FACTOR:</span>
          <span className="text-emerald-300 font-bold">{isPaused ? 'MOTION PAUSED' : `${timeSpeed.toFixed(1)}x Earth speed`}</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="slider-time-speed"
            type="range"
            min="0"
            max="12"
            step="0.2"
            value={isPaused ? 0 : timeSpeed}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val === 0) {
                setIsPaused(true);
              } else {
                setTimeSpeed(val);
                setIsPaused(false);
              }
            }}
            className="flex-1 accent-white h-[4px] bg-white/10 rounded-lg cursor-pointer transition-all hover:bg-white/15"
          />
        </div>
        <div className="flex justify-between gap-2 pt-1">
          <button 
            id="btn-speed-quarter"
            onClick={() => handleSpeedQuickSet(0.5)} 
            className="flex-1 py-1.5 text-[10px] font-mono rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition"
          >
            0.5x
          </button>
          <button 
            id="btn-speed-one"
            onClick={() => handleSpeedQuickSet(1.0)} 
            className="flex-1 py-1.5 text-[10px] font-mono rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition"
          >
            1.0x
          </button>
          <button 
            id="btn-speed-five"
            onClick={() => handleSpeedQuickSet(4.0)} 
            className="flex-1 py-1.5 text-[10px] font-mono rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition"
          >
            4x
          </button>
          <button 
            id="btn-speed-twelve"
            onClick={() => handleSpeedQuickSet(10.0)} 
            className="flex-1 py-1.5 text-[10px] font-mono rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition"
          >
            10x
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 3. Scale Mode Config */}
        <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl space-y-3">
          <span className="text-[10px] font-mono text-gray-300 uppercase flex items-center gap-1 opacity-60">
            <Scale className="w-3.5 h-3.5 text-blue-300" />
            <span>Orbit Distance Matrix</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-scale-visual"
              onClick={() => setScaleMode('visual')}
              className={`py-2 text-[10px] font-bold uppercase tracking-wider font-mono rounded-xl border transition cursor-pointer ${
                scaleMode === 'visual'
                  ? 'bg-white/15 text-white border-white/30 shadow-lg'
                  : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              Visual Spacing
            </button>
            <button
              id="btn-scale-realistic"
              onClick={() => setScaleMode('realistic')}
              className={`py-2 text-[10px] font-bold uppercase tracking-wider font-mono rounded-xl border transition cursor-pointer ${
                scaleMode === 'realistic'
                  ? 'bg-white/15 text-white border-white/30 shadow-lg'
                  : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              True AU scale
            </button>
          </div>
          <p className="text-[10px] leading-relaxed opacity-60">
            {scaleMode === 'visual'
              ? 'Distances are optimized linearly to allow clear orbital tracking of all planets.'
              : 'Orbits are mapped to exact real-world Astronomical Units (AU).'}
          </p>
        </div>

        {/* 4. Planetary Size Config */}
        <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl space-y-3">
          <span className="text-[10px] font-mono text-gray-300 uppercase flex items-center gap-1 opacity-60">
            <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Celestial Size Proportions</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-size-visual"
              onClick={() => setSizeMode('visual')}
              className={`py-2 text-[10px] font-bold uppercase tracking-wider font-mono rounded-xl border transition cursor-pointer ${
                sizeMode === 'visual'
                  ? 'bg-white/15 text-white border-white/30 shadow-lg'
                  : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              Adjusted Scale
            </button>
            <button
              id="btn-size-realistic"
              onClick={() => setSizeMode('realistic')}
              className={`py-2 text-[10px] font-bold uppercase tracking-wider font-mono rounded-xl border transition cursor-pointer ${
                sizeMode === 'realistic'
                  ? 'bg-white/15 text-white border-white/30 shadow-lg'
                  : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              True Proportions
            </button>
          </div>
          <p className="text-[10px] leading-relaxed opacity-60">
            {sizeMode === 'visual'
              ? 'Planet radiuses are scaled up selectively so smaller satellites remain clearly visible.'
              : 'Reflects accurate relative planetary ratios. Inner planets will be very small.'}
          </p>
        </div>
      </div>

      {/* 5. Quick Toggles panel */}
      <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              id="toggle-orbit-paths"
              type="checkbox"
              checked={showOrbits}
              onChange={(e) => setShowOrbits(e.target.checked)}
              className="accent-white w-4 h-4 rounded-md border-white/20 bg-transparent cursor-pointer"
            />
            <span className="text-[11px] font-mono text-gray-300 tracking-wide">Show Orbit Tracks</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              id="toggle-planet-labels"
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="accent-white w-4 h-4 rounded-md border-white/20 bg-transparent cursor-pointer"
            />
            <span className="text-[11px] font-mono text-gray-300 tracking-wide">Celestial Identifiers</span>
          </label>
        </div>
      </div>

      {/* 6. Planet Launcher Buttons at Bottom for quick flyby */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-1.5">
          <Orbit className="w-3.5 h-3.5" />
          <span>Quick Fly-by Celestial Intercepts & Coordinates</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            id="btn-select-sun"
            onClick={handleSelectSun}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono transition border cursor-pointer ${
              selectedPlanetId === null
                ? 'bg-white/15 text-white border-white/30 shadow-lg font-bold'
                : 'bg-white/5 text-gray-300 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            ☉ Sun
          </button>
          
          {PLANETS.map(p => (
            <button
              key={p.id}
              id={`btn-select-${p.id}`}
              onClick={() => onSelectPlanet(p)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono transition border cursor-pointer ${
                selectedPlanetId === p.id
                  ? 'bg-white/15 text-white border-white/30 shadow-lg font-bold'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
