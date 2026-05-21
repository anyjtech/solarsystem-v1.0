import { useState } from 'react';
import { PlanetData, SpaceProbe } from './types';
import { PLANETS, SUN_DATA } from './data';
import SolarSystemCanvas from './components/SolarSystemCanvas';
import PlanetDetails from './components/PlanetDetails';
import SimulationControls from './components/SimulationControls';
import { Compass, Globe, Info, HelpCircle } from 'lucide-react';

export default function App() {
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [timeSpeed, setTimeSpeed] = useState<number>(1.5);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<'visual' | 'realistic'>('visual');
  const [sizeMode, setSizeMode] = useState<'visual' | 'realistic'>('visual');
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [probes, setProbes] = useState<SpaceProbe[]>([]);

  // Action: Reset all planetary angles back to arbitrary starting lineup positions
  const handleResetAngles = () => {
    // We can also re-trigger standard canvas setup, but let's just clear active telemetry probes
    setProbes([]);
  };

  // Launch interactive pixel coordinates probe from Earth to Selected planet
  const handleLaunchProbe = (targetPlanetId: string) => {
    // Check if probe already exists towards this target
    if (probes.some(p => p.targetPlanetId === targetPlanetId)) return;

    // Create a new probe
    const newProbe: SpaceProbe = {
      planetId: 'earth', // Starts at Earth
      targetPlanetId: targetPlanetId,
      progress: 0.0,
      currentPos: { x: 0, y: 0, z: 0 },
      trail: [],
      status: 'launching'
    };

    setProbes(prev => [...prev, newProbe]);
  };

  const isSelectedProbeActive = selectedPlanet 
    ? probes.some(p => p.targetPlanetId === selectedPlanet.id)
    : false;

  return (
    <div 
      id="root-space-dashboard"
      className="min-h-screen bg-[#02040a] text-white flex flex-col antialiased overflow-x-hidden relative select-none"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #0a1024 0%, #02040a 100%)' }}
    >
      {/* Nebula Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/15 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] bg-blue-900/15 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Top Header Navigation */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-8 py-5 z-20 bg-white/[0.03] border-b border-white/10 backdrop-blur-md gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-300"></div>
          <div>
            <h1 className="text-lg font-bold tracking-widest uppercase">
              Solar System Sim <span className="font-thin opacity-50">AstroOs v1.0</span>
            </h1>
            <p className="text-[10px] font-mono text-gray-400 opacity-60 tracking-wider">
              HIGH-FIDELITY FROSTED ORRERY 3D
            </p>
          </div>
        </div>

        {/* Informative solar status widgets */}
        <div className="flex items-center gap-6 text-[10px] font-mono tracking-widest uppercase">
          <div className="flex flex-col items-end text-right">
            <span className="opacity-40 font-bold">SYSTEM TIME UT</span>
            <span className="text-yellow-400 font-semibold">{new Date().toISOString().substring(11, 19)} UTC</span>
          </div>
          <div className="w-[1px] h-6 bg-white/10"></div>
          <div className="flex flex-col items-end text-right">
            <span className="opacity-40 font-bold">LOC SENSOR INDEX</span>
            <span className="text-blue-400 font-semibold">{PLANETS.length} Celestial Nodes</span>
          </div>
        </div>
      </header>

      {/* Main Interactive Workspace Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 lg:p-8 gap-6 h-[calc(100vh-80px)] min-h-[600px] z-10">
        
        {/* Left main interactive viewport & dashboard configuration */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          
          {/* Realtime HTML5 high-fidelity 3D Orbits Canvas projection engine */}
          <div className="flex-1 min-h-[460px] relative">
            <SolarSystemCanvas
              selectedPlanetId={selectedPlanet ? selectedPlanet.id : null}
              onSelectPlanet={setSelectedPlanet}
              timeSpeed={timeSpeed}
              setTimeSpeed={setTimeSpeed}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              scaleMode={scaleMode}
              setScaleMode={setScaleMode}
              sizeMode={sizeMode}
              setSizeMode={setSizeMode}
              showOrbits={showOrbits}
              setShowOrbits={setShowOrbits}
              showLabels={showLabels}
              setShowLabels={setShowLabels}
              probes={probes}
              onUpdateProbes={setProbes}
            />
          </div>

          {/* Core high-density dashboard time speed adjusters, modes modifiers and selectors */}
          <SimulationControls
            selectedPlanetId={selectedPlanet ? selectedPlanet.id : null}
            onSelectPlanet={setSelectedPlanet}
            timeSpeed={timeSpeed}
            setTimeSpeed={setTimeSpeed}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            scaleMode={scaleMode}
            setScaleMode={setScaleMode}
            sizeMode={sizeMode}
            setSizeMode={setSizeMode}
            showOrbits={showOrbits}
            setShowOrbits={setShowOrbits}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            onResetAngles={handleResetAngles}
          />
        </div>

        {/* Selected target planet detailed analytics slide-out panel sidebar */}
        {selectedPlanet ? (
          <PlanetDetails
            planet={selectedPlanet}
            onClose={() => setSelectedPlanet(null)}
            onLaunchProbe={handleLaunchProbe}
            probeActive={isSelectedProbeActive}
          />
        ) : (
          /* Empty/Fallback information guides when no planets are focused */
          <div 
            id="sidebar-fallback-card" 
            className="w-full lg:w-[415px] max-w-full shrink-0 h-full backdrop-blur-2xl bg-white/5 border border-white/20 rounded-[2rem] p-8 shadow-2xl flex flex-col justify-center items-center text-center relative overflow-hidden gap-6"
          >
            {/* Background design elements to make fallback card look premium */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <Compass className="w-6 h-6 text-white animate-pulse" />
            </div>

            <div className="space-y-2 max-w-xs relative z-10">
              <span className="text-[10px] tracking-[0.2em] uppercase opacity-60 font-bold">Orbital telemetry</span>
              <h3 className="text-xl font-light tracking-tight text-white">Select a Celestial Node</h3>
              <p className="text-xs leading-relaxed opacity-70">
                Click any celestial orbit trajectory or node directly on the 3D viewport or the quick selection matrix below to reveal atmospheric analysis, thermal stats, and geological layers.
              </p>
            </div>

            {/* Quick instructions breakdown card */}
            <div className="w-full bg-white/5 p-4 rounded-xl border border-white/5 text-left space-y-3 relative z-10">
              <span className="text-[10px] tracking-[0.15em] uppercase opacity-45 font-bold block">Quick Instructions</span>
              <ul className="space-y-1.5 font-mono text-[10px] opacity-65 leading-relaxed">
                <li>• <strong className="text-white opacity-90">Drag viewport</strong> to pivot camera pitch & azimuth</li>
                <li>• <strong className="text-white opacity-90">Scroll wheel</strong> over canvas to zoom sectors</li>
                <li>• <strong className="text-white opacity-90">Direct click</strong> on nodes to lock targets</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
