import { useState, useEffect, useRef, MouseEvent } from 'react';
import { PlanetData, Moon, SpaceProbe } from '../types';
import { SUN_DATA } from '../data';
import { 
  X, Info, Weight, Compass, Send, HelpCircle, 
  Orbit, Flame, Shield, Layers, Globe
} from 'lucide-react';

interface PlanetDetailsProps {
  planet: PlanetData | null;
  onClose: () => void;
  onLaunchProbe: (targetPlanetId: string) => void;
  probeActive: boolean;
}

export default function PlanetDetails({ planet, onClose, onLaunchProbe, probeActive }: PlanetDetailsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'structure' | 'atmosphere' | 'probe'>('info');
  const [earthWeightInput, setEarthWeightInput] = useState<string>('70');
  const [weightResult, setWeightResult] = useState<number | null>(null);
  
  // Custom planet closeup rotation angle
  const closeupCanvasRef = useRef<HTMLCanvasElement>(null);
  const [closeupXRotation, setCloseupXRotation] = useState<number>(0.2); // pitch rotation
  const [closeupYRotation, setCloseupYRotation] = useState<number>(0.0); // yaw rotation
  const isDraggingCloseup = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Weight calculator logic
  useEffect(() => {
    if (!planet) return;
    const wt = parseFloat(earthWeightInput);
    if (!isNaN(wt) && wt > 0) {
      // Weight = Mass * Gravity
      // Earth gravity = 9.81 m/s2
      // target weight = wt * (target g / 9.81)
      const ratio = planet.gravity / 9.81;
      setWeightResult(parseFloat((wt * ratio).toFixed(2)));
    } else {
      setWeightResult(null);
    }
  }, [earthWeightInput, planet]);

  // Handle active planet changes to reset tabs
  useEffect(() => {
    setActiveTab('info');
    setCloseupXRotation(0.2);
    setCloseupYRotation(0.0);
  }, [planet]);

  // Main canvas animation loop for Closeup rotating 3D view
  useEffect(() => {
    const canvas = closeupCanvasRef.current;
    if (!canvas || !planet) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let autoAngle = 0;

    const render = () => {
      // Clear transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const pRadius = 65; // radius of close-up sphere

      // Procedural auto spinning factor if not actively dragging
      if (!isDraggingCloseup.current) {
        autoAngle += 0.007;
      }
      
      const angleY = closeupYRotation + autoAngle;
      const angleX = closeupXRotation;

      // Draw planet atmospheric/corona outer glow first
      const outGlow = ctx.createRadialGradient(cx, cy, pRadius * 0.9, cx, cy, pRadius * 1.25);
      let glowC = 'rgba(255,255,255,0.06)';
      if (planet.id === 'earth') glowC = 'rgba(75, 150, 215, 0.23)';
      if (planet.id === 'venus') glowC = 'rgba(229, 169, 59, 0.18)';
      if (planet.id === 'uranus') glowC = 'rgba(126, 196, 207, 0.2)';
      if (planet.id === 'neptune') glowC = 'rgba(52, 94, 181, 0.25)';
      if (planet.id === 'mars') glowC = 'rgba(198, 95, 67, 0.15)';
      
      outGlow.addColorStop(0, glowC);
      outGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = outGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, pRadius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Draw base planet sphere
      ctx.beginPath();
      ctx.arc(cx, cy, pRadius, 0, Math.PI * 2);

      // Define static illumination source (lighting comes from the upper left in the closeup panel)
      const lightSourceX = cx - pRadius * 0.45;
      const lightSourceY = cy - pRadius * 0.45;

      const sphereGrad = ctx.createRadialGradient(
        lightSourceX, 
        lightSourceY, 
        5, 
        cx, 
        cy, 
        pRadius
      );
      sphereGrad.addColorStop(0, planet.accentColor);
      sphereGrad.addColorStop(0.5, planet.color);
      sphereGrad.addColorStop(1, '#02020a'); // deep shadow
      
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // Draw procedural texture details rotating dynamically
      ctx.save();
      ctx.clip(); // clip textures inside sphere bounds

      // Drawing patterns based on the planet texture type
      if (planet.texturePattern === 'bands') {
        const bandsCount = 4;
        const speedMultiplier = 1.0;
        
        ctx.fillStyle = 'rgba(0,0,0,0.11)';
        for (let i = -1.2; i < 1.2; i += 0.5) {
          // Band centers oscillate under perspective
          const offset = Math.sin(angleX) * pRadius * i;
          const height = pRadius * 0.15 * Math.cos(angleX);
          
          ctx.beginPath();
          ctx.ellipse(cx, cy + offset, pRadius, height, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Add details like the Great Red Spot for Jupiter
        if (planet.id === 'jupiter') {
          // Jupiter's Great Red Spot coordinates rotate!
          const spotAngle = angleY + 1.2;
          const spotX = cx + Math.sin(spotAngle) * pRadius * 0.65;
          const spotY = cy + Math.sin(angleX) * pRadius * 0.35 + Math.cos(spotAngle) * pRadius * 0.08 * Math.sin(angleX);

          // Draw if in front (cos(spotAngle) > 0)
          if (Math.cos(spotAngle) > 0) {
            ctx.fillStyle = '#C62828'; // Crimson
            ctx.beginPath();
            ctx.ellipse(spotX, spotY, 11, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#D84315';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(spotX, spotY, 13, 9, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      } else if (planet.texturePattern === 'craters' || planet.texturePattern === 'rocky') {
        // Draw crater shapes on the sphere rotating with angleY
        ctx.fillStyle = 'rgba(0,0,0,0.13)';
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;

        const craters = [
          { lon: 0.2, lat: -0.3, size: 7 },
          { lon: 1.5, lat: 0.4, size: 5 },
          { lon: 2.8, lat: -0.1, size: 10 },
          { lon: 3.9, lat: 0.6, size: 6 },
          { lon: 4.8, lat: -0.5, size: 4 },
          { lon: -1.0, lat: 0.2, size: 8 }
        ];

        craters.forEach(c => {
          const cAngle = angleY + c.lon;
          const cxProj = cx + Math.sin(cAngle) * pRadius * Math.cos(c.lat);
          const cyProj = cy + Math.sin(angleX) * pRadius * Math.sin(c.lat) + Math.cos(cAngle) * pRadius * 0.1 * Math.sin(angleX);

          // Check if on visible side
          if (Math.cos(cAngle) > 0) {
            ctx.beginPath();
            ctx.arc(cxProj, cyProj, c.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        });
      } else if (planet.id === 'earth') {
        // Draw glowing beautiful visual green islands and blue waterways
        ctx.fillStyle = 'rgba(46, 125, 50, 0.45)'; // forest green
        const landMasses = [
          { lon: 0.5, lat: 0.1, r: 18 },
          { lon: 1.2, lat: -0.3, r: 15 },
          { lon: 2.6, lat: 0.4, r: 24 },
          { lon: 4.0, lat: -0.1, r: 20 },
          { lon: 5.2, lat: -0.4, r: 14 }
        ];

        landMasses.forEach(land => {
          const lAngle = angleY + land.lon;
          const lx = cx + Math.sin(lAngle) * pRadius * Math.cos(land.lat);
          const ly = cy + Math.sin(angleX) * pRadius * Math.sin(land.lat) + Math.cos(lAngle) * pRadius * 0.1 * Math.sin(angleX);

          if (Math.cos(lAngle) > 0) {
            ctx.beginPath();
            ctx.arc(lx, ly, land.r, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Add soft moving clouds layer
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        const cloudsAngle = angleY * 1.15; // moves slightly faster than planet!
        for (let j = -0.5; j < 0.6; j += 0.4) {
          const cyCloud = cy + j * pRadius * 0.7;
          ctx.beginPath();
          ctx.ellipse(cx + Math.sin(cloudsAngle + j) * pRadius * 0.3, cyCloud, pRadius * 0.6, pRadius * 0.1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Re-apply detailed shaded overlay for dramatic 3D spherical effect
      const finalShading = ctx.createRadialGradient(
        lightSourceX, 
        lightSourceY, 
        pRadius * 0.1, 
        cx, 
        cy, 
        pRadius
      );
      finalShading.addColorStop(0.2, 'rgba(0,0,0,0)');
      finalShading.addColorStop(0.8, 'rgba(0,0,0,0.55)');
      finalShading.addColorStop(1, 'rgba(0,0,0,0.94)');
      ctx.fillStyle = finalShading;
      ctx.beginPath();
      ctx.arc(cx, cy, pRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // end clip

      // Draw planet rings in close-up perspective if present (Saturn & Uranus)
      if (planet.ringRadiusInner && planet.ringColor) {
        // Drawing Saturn rings centered
        const rInner = pRadius * planet.ringRadiusInner;
        const rOuter = pRadius * (planet.ringRadiusOuter || 2);
        
        ctx.strokeStyle = `${planet.ringColor}70`;
        ctx.lineWidth = rOuter - rInner;
        ctx.save();
        
        // Draw the Back part of the ring (behind the planet sphere)
        ctx.beginPath();
        ctx.ellipse(cx, cy, rOuter, rOuter * Math.sin(angleX), 0, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Draw the planet body sphere again in the middle (which clips/occludes rings behind)
        // Actually, we already drew the body, so drawing the front half of the rings now is sufficient!
        ctx.beginPath();
        ctx.ellipse(cx, cy, rOuter, rOuter * Math.sin(angleX), 0, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
      }

      // Draw Moons path in the closeup view
      if (planet.moons.length > 0) {
        planet.moons.forEach((m, i) => {
          const speed = m.speed * 0.2;
          const curMoonAngle = autoAngle * 1.5 + i * 2.0;
          const distOffset = pRadius + 30 + i * 16;
          
          const mx = cx + Math.cos(curMoonAngle) * distOffset;
          const my = cy + Math.sin(curMoonAngle) * distOffset * Math.sin(angleX);

          // Orbit path line
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, distOffset, distOffset * Math.sin(angleX), 0, 0, Math.PI * 2);
          ctx.stroke();

          // Draw if in front (adjust based on math height)
          const drawingZ = Math.sin(curMoonAngle);
          
          // Draw moon body
          ctx.fillStyle = '#CFD8DC';
          ctx.beginPath();
          ctx.arc(mx, my, m.size, 0, Math.PI * 2);
          ctx.fill();

          // Tiny moon name tag on hover or subtle
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.font = '7.5px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(m.name, mx, my - m.size - 2);
        });
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [planet, closeupXRotation, closeupYRotation]);

  if (!planet) return null;

  // Manual closeup dragging action
  const handleCloseupMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    isDraggingCloseup.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCloseupMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCloseup.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    setCloseupYRotation(prev => prev - dx * 0.009);
    setCloseupXRotation(prev => Math.max(-0.6, Math.min(0.6, prev + dy * 0.009)));

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCloseupMouseUp = () => {
    isDraggingCloseup.current = false;
  };

  return (
    <div 
      id="planet-details-sidebar"
      className="w-full lg:w-[415px] max-w-full shrink-0 h-full bg-white/[0.03] backdrop-blur-2xl border-t lg:border-t-0 lg:border-l border-white/20 shadow-2xl overflow-y-auto flex flex-col z-20"
    >
      {/* Detail Header Panel */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] bg-white/10 text-white border border-white/20 rounded-full px-2.5 py-0.5 font-bold">
            {planet.type === 'planet' ? 'Celestial Node' : 'Dwarf Sat'}
          </span>
          <h2 className="text-2xl font-light tracking-tight text-white mt-2">
            {planet.name}
          </h2>
        </div>
        <button 
          id="btn-close-details"
          onClick={onClose}
          className="p-2 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl text-gray-400 border border-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Visual Interactive 3D Sphere Rotating Canvas Closeup */}
      <div className="bg-white/[0.01] p-6 flex flex-col items-center justify-center border-b border-white/10 relative gap-3">
        <canvas
          id="closeup-3d-canvas"
          ref={closeupCanvasRef}
          width={280}
          height={180}
          onMouseDown={handleCloseupMouseDown}
          onMouseMove={handleCloseupMouseMove}
          onMouseUp={handleCloseupMouseUp}
          onMouseLeave={handleCloseupMouseUp}
          className="cursor-grab active:cursor-grabbing max-w-full select-none rounded-2xl"
          title="Drag to rotate planet sphere manually"
        />
        <p className="text-[10px] font-mono text-gray-400 flex items-center gap-1.5 opacity-60">
          <Globe className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          <span>Interactive Orbit Closeup • Drag Sphere to Rotate</span>
        </p>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-white/10 text-xs">
        <button
          id="tab-info"
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-4 text-center transition font-mono border-b-2 text-[10px] uppercase tracking-wider font-bold ${activeTab === 'info' ? 'text-white border-white bg-white/5' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/[0.02]'}`}
        >
          Overview
        </button>
        <button
          id="tab-structure"
          onClick={() => setActiveTab('structure')}
          className={`flex-1 py-4 text-center transition font-mono border-b-2 text-[10px] uppercase tracking-wider font-bold ${activeTab === 'structure' ? 'text-white border-white bg-white/5' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/[0.02]'}`}
        >
          Layers
        </button>
        <button
          id="tab-atmosphere"
          onClick={() => setActiveTab('atmosphere')}
          className={`flex-1 py-4 text-center transition font-mono border-b-2 text-[10px] uppercase tracking-wider font-bold ${activeTab === 'atmosphere' ? 'text-white border-white bg-white/5' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/[0.02]'}`}
        >
          Atmosphere
        </button>
        <button
          id="tab-probe"
          onClick={() => setActiveTab('probe')}
          className={`flex-1 py-4 text-center transition font-mono border-b-2 text-[10px] uppercase tracking-wider font-bold ${activeTab === 'probe' ? 'text-white border-white bg-white/5' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/[0.02]'}`}
        >
          Telemetry
        </button>
      </div>

      {/* Active Tab Contents */}
      <div className="p-6 flex-1">
        {activeTab === 'info' && (
          <div className="space-y-5">
            {/* Description Summary */}
            <p className="text-gray-300 text-xs leading-relaxed opacity-85">
              {planet.description}
            </p>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl shadow-sm">
                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Mass</p>
                <p className="font-semibold text-white mt-1 text-[13px]">{planet.mass}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl shadow-sm">
                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Gravity</p>
                <p className="font-semibold text-white mt-1 text-[13px]">{planet.gravity} m/s²</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl shadow-sm">
                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Diameter</p>
                <p className="font-semibold text-white mt-1 text-[13px]">{planet.diameter.toLocaleString()} km</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl shadow-sm">
                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Temperature</p>
                <p className="font-semibold text-white mt-1 text-[13px]">{planet.tempRange}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl shadow-sm">
                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Orbit Distance</p>
                <p className="font-semibold text-white mt-1 text-[13px]">{planet.distanceFromSun} AU</p>
                <p className="text-[9px] font-mono text-gray-400 opacity-50">~{planet.realDistanceMillionKm}M km</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl shadow-sm">
                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Solar Year</p>
                <p className="font-semibold text-white mt-1 text-[13px]">{planet.orbitalPeriod}</p>
              </div>
            </div>

            {/* Moons list details */}
            {planet.moons.length > 0 ? (
              <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl mt-2">
                <h4 className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest flex items-center gap-1.5 mb-2.5 font-bold">
                  <Orbit className="w-3.5 h-3.5" />
                  <span>Satellites ({planet.moons.length} Moons)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {planet.moons.map((moon, index) => (
                    <span 
                      key={index}
                      className="text-[10px] bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 transition cursor-help font-mono"
                      title={`Orbits once every visual period scale: ${Math.abs(1 / moon.speed).toFixed(0)} cycles.`}
                    >
                      ☾ {moon.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 p-4 rounded-xl text-center text-[10px] text-gray-400 font-mono">
                No natural satellites detected orbiting {planet.name}.
              </div>
            )}

            {/* Interesting Fun Facts Carousel/Stack */}
            <div className="space-y-3 mt-2">
              <h4 className="text-[10px] font-mono text-amber-300 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5" />
                <span>Geophysical Log Highlights</span>
              </h4>
              <ul className="space-y-2">
                {planet.funFacts.map((fact, index) => (
                  <li key={index} className="text-[11px] text-gray-300 leading-relaxed pl-3 relative border-l border-amber-300/40 opacity-80">
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Internal Geological Structure */}
        {activeTab === 'structure' && (
          <div className="space-y-5">
            <h3 className="text-xs font-mono text-gray-300 uppercase flex items-center gap-1.5 border-b border-white/10 pb-2">
              <Layers className="w-4 h-4 text-emerald-300" />
              <span>Internal Geological Cutaway</span>
            </h3>

            {/* Visual core cutaway gauge */}
            <div className="h-6 w-full rounded-full bg-white/5 border border-white/10 overflow-hidden flex">
              {planet.structure.map((layer, idx) => (
                <div
                  key={idx}
                  style={{ 
                    width: `${100 / planet.structure.length}%`, 
                    backgroundColor: layer.color 
                  }}
                  className="h-full relative group transition cursor-pointer hover:brightness-110"
                  title={`${layer.name}: ${layer.thickness}`}
                />
              ))}
            </div>

            {/* Detailed structure breakdown table */}
            <div className="space-y-3">
              {planet.structure.map((layer, idx) => (
                <div 
                  key={idx} 
                  className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex items-start gap-3 shadow-sm hover:bg-white/[0.07] transition"
                >
                  <div 
                    style={{ backgroundColor: layer.color }}
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 mt-0.5"
                  />
                  <div className="text-xs flex-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-white text-[13px] font-medium">{layer.name}</span>
                      <span className="text-emerald-300 font-mono text-[11px] font-bold">{layer.thickness}</span>
                    </div>
                    <p className="text-gray-300 text-[11px] mt-1.5 leading-relaxed opacity-80">
                      Composed primarily of <span className="text-white font-medium">{layer.composition}</span>.
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Weight calculator widget */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mt-4">
              <h4 className="text-[10px] font-mono text-blue-300 uppercase tracking-widest flex items-center gap-1.5 mb-2 font-bold">
                <Weight className="w-4 h-4" />
                <span>Structural Mass Correlation</span>
              </h4>
              <p className="text-[10px] text-gray-400 mb-4 [line-height:1.4]">
                Determine the impact of local gravity on standard body structures relative to Earth calibration.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Earth Mass (kg)</span>
                  <input
                    id="input-weight-calc"
                    type="number"
                    value={earthWeightInput}
                    onChange={(e) => setEarthWeightInput(e.target.value)}
                    className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white focus:bg-white/10 font-mono transition"
                    placeholder="e.g. 70"
                    min="1"
                    max="500"
                  />
                </div>
                <div className="flex-1 bg-white/[0.02] p-3 rounded-xl border border-white/10 text-center shadow-inner">
                  <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">New Yield</span>
                  <div className="text-base font-semibold text-emerald-300 mt-1.5 font-mono tracking-wide">
                    {weightResult !== null ? `${weightResult} kg` : '--'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Atmospheric Air Breakdown */}
        {activeTab === 'atmosphere' && (
          <div className="space-y-5">
            <h3 className="text-xs font-mono text-gray-300 uppercase flex items-center gap-1.5 border-b border-white/10 pb-2">
              <Shield className="w-4 h-4 text-emerald-300" />
              <span>Atmosphere Composition Gas Gauges</span>
            </h3>

            {planet.atmosphere.length > 0 ? (
              <div className="space-y-4">
                {planet.atmosphere.map((g, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-medium">{g.gas}</span>
                      <span className="text-emerald-300 font-mono font-bold">{g.percentage}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <div 
                        style={{ width: g.percentage === 'Trace' ? '3%' : g.percentage }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      />
                    </div>
                  </div>
                ))}
                
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mt-4 text-center">
                  <p className="text-[10px] font-mono text-gray-300 leading-normal opacity-75">
                    Gas layer density correlation complete. Pressure index is calculated to be {' '}
                    {planet.id === 'venus' ? 'extraordinarily crushing (92 bar).' : planet.id === 'mars' ? 'extremely thin and frozen.' : 'massively dense at outer mantle thresholds.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 p-6 rounded-2xl text-center">
                <p className="text-xs font-mono text-gray-300 opacity-80">
                  No Atmosphere Layer Detected
                </p>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  Celestial node surface is exposed directly to cosmic vacuum. Typical of outer dwarf envelopes or regions affected by high solar wind erosion.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Interactive Space Probe Launcher */}
        {activeTab === 'probe' && (
          <div className="space-y-5">
            <h3 className="text-xs font-mono text-gray-300 uppercase flex items-center gap-1.5 border-b border-white/10 pb-2">
              <Compass className="w-4 h-4 text-emerald-300" />
              <span>Telemetry Probe Launcher</span>
            </h3>
            
            <p className="text-gray-300 text-xs leading-relaxed opacity-85">
              Launch a thermal and gravity sensor orbital probe from Earth directly into {planet.name} orbit to receive data streams.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Launch Status:</span>
                <span className={`font-mono px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${probeActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 animate-pulse' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                  {probeActive ? 'ACTIVE TELEMETRY' : 'READY TO DEPLOY'}
                </span>
              </div>

              {/* Console log simulator */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 h-28 font-mono text-[9px] text-emerald-300 overflow-y-auto space-y-1 shadow-inner">
                <p className="opacity-40">{`> telemetry node synchronized`}</p>
                {probeActive && (
                  <>
                    <p className="text-cyan-300 font-bold">{`> [PROBE-X] hyper-drive thrust core ignited`}</p>
                    <p className={`text-cyan-300`}>{`> deep gravity slingshot complete [11.2 km/s]`}</p>
                    <p className={`text-emerald-300 font-bold`}>{`> payload intercept trajectory calculated: ${planet.name}`}</p>
                    <p className="animate-pulse">{`> tracking signals connected.`}</p>
                  </>
                )}
                {!probeActive && (
                  <p className="opacity-40">{`> click launch button below to begin mission`}</p>
                )}
              </div>

              <button
                id="btn-launch-probe"
                onClick={() => onLaunchProbe(planet.id)}
                disabled={probeActive || planet.id === 'earth'}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white hover:opacity-90 disabled:brightness-75 disabled:opacity-40 transition p-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{planet.id === 'earth' ? 'Already Orbiting Earth' : probeActive ? 'Transmitting...' : 'Release Probe Payload'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sun specific details alternative toggle footer if needed */}
      <div className="p-4 bg-white/5 border-t border-white/10 text-[9px] font-mono text-center text-gray-400 flex justify-center items-center gap-1.5">
        <span>Object:</span>
        <span className="text-white font-bold uppercase">{planet.name}</span>
        <span>•</span>
        <span>Distance: {planet.distanceFromSun} AU</span>
      </div>
    </div>
  );
}
