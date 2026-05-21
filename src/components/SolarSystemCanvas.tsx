import { useEffect, useRef, useState, MouseEvent, WheelEvent } from 'react';
import { PlanetData, PlanetState, CameraConfig, Vector3D, SpaceProbe } from '../types';
import { PLANETS } from '../data';
import { Play, Pause, RotateCcw, Compass, ZoomIn, ZoomOut, Eye, Info } from 'lucide-react';

interface SolarSystemCanvasProps {
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
  probes: SpaceProbe[];
  onUpdateProbes: (updater: (prev: SpaceProbe[]) => SpaceProbe[]) => void;
}

// Sparkle/background stars
interface Star {
  x: number;
  y: number;
  z: number;
  brightness: number;
}

export default function SolarSystemCanvas({
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
  probes,
  onUpdateProbes
}: SolarSystemCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Math simulation state
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [camera, setCamera] = useState<CameraConfig>({
    pitch: 0.65, // oblique angle looking from above
    yaw: -0.45,   // angled slightly offset
    zoom: 1.0,
    offsetX: 0,
    offsetY: 0
  });

  // State of planets angles and velocities
  const planetStatesRef = useRef<PlanetState[]>(
    PLANETS.map((p, idx) => ({
      id: p.id,
      currentAngle: Math.random() * Math.PI * 2, // random starting angle
      pos3d: { x: 0, y: 0, z: 0 },
      pos2d: { x: 0, y: 0, zDepth: 0 }
    }))
  );

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const starsRef = useRef<Star[]>([]);
  const targetCameraLerpRef = useRef<{ offsetX: number; offsetY: number; zoom: number } | null>(null);

  // Initialize stars once
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 300; i++) {
      // stars generated in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 800 + Math.random() * 1200; // distant skybox
      stars.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        brightness: 0.3 + Math.random() * 0.7
      });
    }
    starsRef.current = stars;
  }, []);

  // Track parent resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDimensions({
          width: Math.max(400, Math.floor(rect.width)),
          height: Math.max(300, Math.floor(rect.height))
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update target zoom and pan offsets when selected planet changes
  useEffect(() => {
    if (selectedPlanetId === null) {
      // zoom out and center sun
      targetCameraLerpRef.current = {
        offsetX: 0,
        offsetY: 0,
        zoom: 0.8
      };
    } else {
      // Find planet data
      const planet = PLANETS.find(p => p.id === selectedPlanetId);
      if (planet) {
        // target zoom increases for planets further away, keeping them visible
        let targetZoom = 1.8;
        if (sizeMode === 'realistic') {
          targetZoom = 3.5;
        }
        targetCameraLerpRef.current = {
          offsetX: 0, // we center the viewport relative to the focused planet
          offsetY: 0,
          zoom: targetZoom
        };
      }
    }
  }, [selectedPlanetId, sizeMode]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      // Clear dark cosmos background
      ctx.fillStyle = '#020205'; // very deep space dark
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // 1. ADVANCE PLANETARY ANGLES
      const dtSim = isPaused ? 0 : deltaTime * timeSpeed * 3.0;
      PLANETS.forEach(planet => {
        const state = planetStatesRef.current.find(s => s.id === planet.id);
        if (state) {
          // orbital movement
          state.currentAngle += planet.orbitalSpeed * dtSim;
          if (state.currentAngle > Math.PI * 2) {
            state.currentAngle -= Math.PI * 2;
          }
        }
      });

      // 2. CACULATE 3D / 2D POSITIONS OF PLANETS
      const originX = dimensions.width / 2;
      const originY = dimensions.height / 2;

      // Define visual spacing distances for visual/schematic mode
      const visualDistances: Record<string, number> = {
        mercury: 55,
        venus: 85,
        earth: 120,
        mars: 155,
        jupiter: 205,
        saturn: 265,
        uranus: 325,
        neptune: 385,
        pluto: 435
      };

      // Orbit inclinational angles in radians to give beautiful 3D orbits offset
      const orbitalInclinations: Record<string, number> = {
        mercury: 0.12,
        venus: 0.06,
        earth: 0.0,
        mars: 0.03,
        jupiter: 0.02,
        saturn: 0.04,
        uranus: 0.01,
        neptune: 0.03,
        pluto: 0.30 // Pluto is famously tilted!
      };

      PLANETS.forEach(planet => {
        const state = planetStatesRef.current.find(s => s.id === planet.id);
        if (state) {
          let r = 100;
          if (scaleMode === 'realistic') {
            // Realistic distances relative to Earth = 150px
            r = planet.distanceFromSun * 120;
          } else {
            r = visualDistances[planet.id] || 150;
          }

          // Angle
          const angle = state.currentAngle;
          const tilt = orbitalInclinations[planet.id] || 0.0;

          // Compute 3D coordinates (with realistic tilt)
          // X-Y plane orbit tilted in Z-axis
          state.pos3d.x = r * Math.cos(angle);
          state.pos3d.y = r * Math.sin(angle) * Math.cos(tilt);
          state.pos3d.z = r * Math.sin(angle) * Math.sin(tilt);
        }
      });

      // Handle camera smooth centering & zooms
      const focusedState = selectedPlanetId
        ? planetStatesRef.current.find(s => s.id === selectedPlanetId)
        : null;

      if (targetCameraLerpRef.current) {
        const target = targetCameraLerpRef.current;
        const lerpFactor = 0.04;

        setCamera(prev => {
          let dx = 0;
          let dy = 0;

          if (focusedState) {
            // Target camera offsets offset are set to invert the planet coordinate
            // to keep it focused in center!
            // Project the target planet coordinate in rotated camera space
            const x1 = focusedState.pos3d.x * Math.cos(prev.yaw) - focusedState.pos3d.y * Math.sin(prev.yaw);
            const y1 = focusedState.pos3d.x * Math.sin(prev.yaw) + focusedState.pos3d.y * Math.cos(prev.yaw);
            const z1 = focusedState.pos3d.z;

            // Apply pitch
            const x2 = x1;
            const y2 = y1 * Math.cos(prev.pitch) - z1 * Math.sin(prev.pitch);

            dx = -x2;
            dy = -y2;
          }

          return {
            ...prev,
            offsetX: prev.offsetX + (dx - prev.offsetX) * lerpFactor,
            offsetY: prev.offsetY + (dy - prev.offsetY) * lerpFactor,
            zoom: prev.zoom + (target.zoom - prev.zoom) * lerpFactor
          };
        });
      }

      // 3. MATH DRAW UTILITIES
      // Math function to rotate 3D point using camera pitch/yaw, offset, and zoom
      const project3D = (point: Vector3D) => {
        // Yaw (rotation around Z orbit plane)
        const x1 = point.x * Math.cos(camera.yaw) - point.y * Math.sin(camera.yaw);
        const y1 = point.x * Math.sin(camera.yaw) + point.y * Math.cos(camera.yaw);
        const z1 = point.z;

        // Pitch (vertical rotation)
        const x2 = x1;
        const y2 = y1 * Math.cos(camera.pitch) - z1 * Math.sin(camera.pitch);
        const z2 = y1 * Math.sin(camera.pitch) + z1 * Math.cos(camera.pitch); // Depth parameter

        // Project and apply camera offsets (pan)
        // With focus centered representation:
        const screenX = originX + (x2 + camera.offsetX) * camera.zoom;
        const screenY = originY + (y2 + camera.offsetY) * camera.zoom;

        return {
          x: screenX,
          y: screenY,
          zDepth: z2 // negative is further away, positive is closer
        };
      };

      // 4. DRAW STARFIELD WITH DEPTH PARALLAX
      if (starsRef.current.length > 0) {
        starsRef.current.forEach(star => {
          // Project stars using yaw/pitch but with huge depth skybox (infinite center)
          const proj = project3D(star);
          // Only draw stars inside bounding viewport
          if (proj.x >= 0 && proj.x <= dimensions.width && proj.y >= 0 && proj.y <= dimensions.height) {
            // Draw star with brightness
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * (camera.zoom > 1.0 ? 0.6 : 0.8)})`;
            ctx.fillRect(proj.x, proj.y, 1.2, 1.2);
          }
        });
      }

      // Draw dynamic subtle background space dust nebula glow
      const radialNebula = ctx.createRadialGradient(originX, originY, 1, originX, originY, Math.max(dimensions.width, dimensions.height));
      radialNebula.addColorStop(0, 'rgba(15, 8, 30, 0.25)'); // cosmic violet glow
      radialNebula.addColorStop(0.5, 'rgba(8, 12, 28, 0.1)');
      radialNebula.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radialNebula;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // 5. UPDATE PROBES STATE PHYSICS IF ANY ACTIVE
      if (probes.length > 0) {
        onUpdateProbes(prevProbes =>
          prevProbes.map(probe => {
            if (probe.status === 'orbiting' || probe.status === 'landed') {
              // Probe orbits the selected planet
              const targetP = PLANETS.find(p => p.id === probe.targetPlanetId);
              const targetState = planetStatesRef.current.find(s => s.id === probe.targetPlanetId);
              if (targetP && targetState) {
                const speed = 0.05;
                const progressInc = (probe.progress + speed) % (Math.PI * 2);
                
                // Visual tiny satellite orbit coordinates around the planet
                const orbDist = 14; 
                const px = targetState.pos3d.x + Math.cos(progressInc) * orbDist;
                const py = targetState.pos3d.y + Math.sin(progressInc) * orbDist;
                const pz = targetState.pos3d.z + Math.sin(progressInc) * orbDist * 0.3; // tilted probe
                
                // Add trail
                const newPos = { x: px, y: py, z: pz };
                const newTrail = [...probe.trail, newPos].slice(-25);
                
                return {
                  ...probe,
                  progress: progressInc,
                  currentPos: newPos,
                  trail: newTrail,
                  status: 'orbiting'
                };
              }
              return probe;
            } else if (probe.progress < 1) {
              const fromPlanetId = probe.planetId; // Earth
              const toPlanetId = probe.targetPlanetId;
              
              const fromState = planetStatesRef.current.find(s => s.id === fromPlanetId);
              const toState = planetStatesRef.current.find(s => s.id === toPlanetId);

              if (fromState && toState) {
                // S-curve interpolation
                const nextProgress = Math.min(1, probe.progress + deltaTime * 0.23); // Travel speed takes ~4 seconds
                const t = nextProgress;

                // Simple linear/cubic lerp for coordinates
                const px = fromState.pos3d.x + (toState.pos3d.x - fromState.pos3d.x) * t;
                const py = fromState.pos3d.y + (toState.pos3d.y - fromState.pos3d.y) * t;
                // Add a beautiful bezier height arc in Z dimension!
                const arcHeight = 40 * Math.sin(t * Math.PI);
                const pz = fromState.pos3d.z + (toState.pos3d.z - fromState.pos3d.z) * t + arcHeight;

                const newPos = { x: px, y: py, z: pz };
                const newTrail = [...probe.trail, newPos].slice(-32);

                const status = nextProgress >= 1 ? 'orbiting' : 'cruising';

                return {
                  ...probe,
                  progress: nextProgress,
                  currentPos: newPos,
                  trail: newTrail,
                  status
                };
              }
            }
            return probe;
          })
        );
      }

      // 6. COLLECT RENDERING OBJECTS & SORT BY DEPTH FOR REALISTIC OCCLUSION!
      // This is the magical part where orbit halves, planets, sun, and probes are layered!
      interface Renderable {
        type: 'sun' | 'planet' | 'orbit' | 'probe' | 'reticle';
        zDepth: number;
        id?: string;
        renderFn: () => void;
      }

      const renderList: Renderable[] = [];

      // Orbits paths (drawn as curves)
      // To display orbits behind/around correctly, let's treat orbit paths as lines.
      // We can add them to RenderList with a depth that is the average height or we can draw them with partial opacities.
      // For pristine look, we can draw orbits in depth layers! Or draw behind orbits first.
      // Let's add orbit rings as Renderable. An orbit path can be drawn in segments.
      // Alternatively, drawing orbit paths in 3D can be done. Let's add them at standard backdepth first,
      // but to be perfectly premium, let's sample it!
      PLANETS.forEach(planet => {
        const state = planetStatesRef.current.find(s => s.id === planet.id);
        if (state && showOrbits) {
          // Add orbit path as a renderable with a slightly negative depth to draw behind planets
          // Average zDepth of orbit is roughly 0 (centered around Sun), so let's put it at Z=0
          renderList.push({
            type: 'orbit',
            zDepth: -1000, // draw behind everything except deep background
            id: planet.id,
            renderFn: () => {
              const tilt = orbitalInclinations[planet.id] || 0.0;
              let r = 100;
              if (scaleMode === 'realistic') {
                r = planet.distanceFromSun * 120;
              } else {
                r = visualDistances[planet.id] || 150;
              }

              ctx.beginPath();
              let isFirst = true;
              
              // Draw orbital ellipse sampled around 90 segments
              const segments = 120;
              for (let i = 0; i <= segments; i++) {
                const sampledAngle = (i * Math.PI * 2) / segments;
                const px = r * Math.cos(sampledAngle);
                const py = r * Math.sin(sampledAngle) * Math.cos(tilt);
                const pz = r * Math.sin(sampledAngle) * Math.sin(tilt);
                
                const proj = project3D({ x: px, y: py, z: pz });
                if (isFirst) {
                  ctx.moveTo(proj.x, proj.y);
                  isFirst = false;
                } else {
                  ctx.lineTo(proj.x, proj.y);
                }
              }

              // Set aesthetic orbit style: highlighted if selected, otherwise faint dotted sky blue
              const isSelected = selectedPlanetId === planet.id;
              ctx.strokeStyle = isSelected 
                ? `${planet.color}80` 
                : 'rgba(74, 91, 128, 0.15)';
              ctx.lineWidth = isSelected ? 1.8 : 1.0;
              
              if (!isSelected) {
                ctx.setLineDash([2, 5]); // neat dotted style
              } else {
                ctx.setLineDash([]);
              }
              
              ctx.stroke();
              ctx.setLineDash([]); // reset style
            }
          });
        }
      });

      // Add Sun
      const sunProj = project3D({ x: 0, y: 0, z: 0 });
      renderList.push({
        type: 'sun',
        zDepth: sunProj.zDepth,
        renderFn: () => {
          // Draw a magnificent glorious pulsating glowing Sun!
          const pulse = 1.0 + 0.02 * Math.sin(time * 0.003);
          const sunRadius = 24 * camera.zoom * pulse;

          // Outermost soft corona glow
          const glowGrad = ctx.createRadialGradient(sunProj.x, sunProj.y, sunRadius * 0.4, sunProj.x, sunProj.y, sunRadius * 2.8);
          glowGrad.addColorStop(0, 'rgba(255, 180, 50, 0.2)');
          glowGrad.addColorStop(0.3, 'rgba(255, 110, 20, 0.08)');
          glowGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(sunProj.x, sunProj.y, sunRadius * 2.8, 0, Math.PI * 2);
          ctx.fill();

          // Core Sun gradient
          const radialSun = ctx.createRadialGradient(sunProj.x - sunRadius * 0.3, sunProj.y - sunRadius * 0.3, 2, sunProj.x, sunProj.y, sunRadius);
          radialSun.addColorStop(0, '#FFFFFF'); // core fusion brightness
          radialSun.addColorStop(0.2, '#FFE082');
          radialSun.addColorStop(0.5, '#FFA726');
          radialSun.addColorStop(0.8, '#F57C00');
          radialSun.addColorStop(1, '#D84315');
          ctx.fillStyle = radialSun;

          ctx.beginPath();
          ctx.arc(sunProj.x, sunProj.y, sunRadius, 0, Math.PI * 2);
          ctx.fill();

          // Subtle solar flare rays pulsing outward
          ctx.strokeStyle = 'rgba(255, 145, 0, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 12]);
          ctx.beginPath();
          ctx.arc(sunProj.x, sunProj.y, sunRadius * 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Add Space Probes
      probes.forEach((probe, idx) => {
        const probeProj = project3D(probe.currentPos);
        renderList.push({
          type: 'probe',
          zDepth: probeProj.zDepth,
          renderFn: () => {
            // Draw trail of the probe
            if (probe.trail.length > 1) {
              ctx.beginPath();
              const firstProj = project3D(probe.trail[0]);
              ctx.moveTo(firstProj.x, firstProj.y);
              for (let i = 1; i < probe.trail.length; i++) {
                const trailProj = project3D(probe.trail[i]);
                ctx.lineTo(trailProj.x, trailProj.y);
              }
              ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }

            // Draw current probe head particle
            ctx.fillStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(probeProj.x, probeProj.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset shadow

            // Small flashing indicator
            const flash = Math.sin(time * 0.01) > 0;
            if (flash) {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(probeProj.x, probeProj.y, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      });

      // Add Planets
      PLANETS.forEach(planet => {
        const state = planetStatesRef.current.find(s => s.id === planet.id);
        if (state) {
          // Project planet 3D coordinates to 2D
          const proj = project3D(state.pos3d);
          state.pos2d.x = proj.x;
          state.pos2d.y = proj.y;
          state.pos2d.zDepth = proj.zDepth;

          // Determine visual sizing based on settings
          let radius = planet.sizeScale;
          if (sizeMode === 'realistic') {
            radius = planet.realSizeScale;
          }
          // Factor zoom in, but clamp minimum size so tiny planets stay clickable
          radius = Math.max(3.0, radius * camera.zoom);

          renderList.push({
            type: 'planet',
            zDepth: proj.zDepth,
            id: planet.id,
            renderFn: () => {
              const x = proj.x;
              const y = proj.y;

              // Draw sub-moons rotating around focused planets
              if (planet.moons.length > 0 && showOrbits) {
                planet.moons.forEach(moon => {
                  const mAngle = time * 0.003 * moon.speed;
                  // Visual offset
                  const offset = moon.distance * (camera.zoom > 1 ? camera.zoom * 0.6 : 0.6);
                  const mx = x + Math.cos(mAngle) * offset;
                  const my = y + Math.sin(mAngle) * offset * Math.cos(camera.pitch);

                  // Moon circle outline path
                  ctx.strokeStyle = 'rgba(120, 130, 160, 0.06)';
                  ctx.lineWidth = 0.5;
                  ctx.beginPath();
                  ctx.ellipse(x, y, offset, offset * Math.cos(camera.pitch), 0, 0, Math.PI * 2);
                  ctx.stroke();

                  // Moon physical body
                  ctx.fillStyle = '#CFD8DC';
                  ctx.beginPath();
                  ctx.arc(mx, my, Math.max(1, moon.size * 0.5 * (camera.zoom > 1 ? camera.zoom * 0.7 : 0.7)), 0, Math.PI * 2);
                  ctx.fill();
                });
              }

              // Draw rings if present (Saturn & Uranus)
              if (planet.ringRadiusInner && planet.ringColor) {
                const rInner = radius * planet.ringRadiusInner;
                const rOuter = radius * (planet.ringRadiusOuter || 2);
                
                // Draw Saturn rings in oblique perspective projection
                ctx.strokeStyle = `${planet.ringColor}50`;
                ctx.lineWidth = rOuter - rInner;
                ctx.beginPath();
                // Draw perfect ellipse skewed by camera pitch
                ctx.ellipse(
                  x,
                  y,
                  rOuter,
                  rOuter * Math.cos(camera.pitch),
                  0, // rings rotation tilt
                  0,
                  Math.PI * 2
                );
                ctx.stroke();
              }

              // Draw core sphere body
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              
              // 3D illumination gradients - lighting source is the Sun at origin!
              // Calculate direction from Sun (origin screen coords) to planet
              const dx = x - sunProj.x;
              const dy = y - sunProj.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              // Normalize direction
              const ldx = dist > 0 ? dx / dist : 0;
              const ldy = dist > 0 ? dy / dist : 0;

              // Core planet radial gradient
              // The light highlight is shifted towards the Sun center!
              const gradientCenterX = x - ldx * (radius * 0.4);
              const gradientCenterY = y - ldy * (radius * 0.4);

              const planetGrad = ctx.createRadialGradient(
                gradientCenterX,
                gradientCenterY,
                radius * 0.05,
                x,
                y,
                radius
              );
              planetGrad.addColorStop(0, planet.accentColor);
              planetGrad.addColorStop(0.6, planet.color);
              planetGrad.addColorStop(1, '#050510'); // dark shadowed side

              ctx.fillStyle = planetGrad;
              ctx.fill();

              // Add visual texture details (bands for gas giants, crater shade effects)
              if (planet.texturePattern === 'bands') {
                ctx.save();
                // Clip drawing to planet sphere
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.clip();

                // Draw atmospheric bands
                ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
                ctx.fillRect(x - radius, y - radius * 0.4, radius * 2, radius * 0.15);
                ctx.fillRect(x - radius, y - radius * 0.1, radius * 2, radius * 0.2);
                ctx.fillRect(x - radius, y + radius * 0.3, radius * 2, radius * 0.13);

                // Re-draw shadowed overlay for banding
                const shadowGrad = ctx.createRadialGradient(
                  gradientCenterX,
                  gradientCenterY,
                  radius * 0.1,
                  x,
                  y,
                  radius
                );
                shadowGrad.addColorStop(0.3, 'rgba(0,0,0,0)');
                shadowGrad.addColorStop(0.9, 'rgba(0,0,0,0.65)');
                shadowGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
                ctx.fillStyle = shadowGrad;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
              }

              // Atmosphere glow for planets with high atmosphere (Earth, Venus, Uranus, Neptune)
              if (['earth', 'venus', 'uranus', 'neptune'].includes(planet.id)) {
                const atmosGlow = ctx.createRadialGradient(x, y, radius * 0.9, x, y, radius * 1.15);
                let glowColor = 'rgba(0, 229, 255, 0.12)';
                if (planet.id === 'venus') glowColor = 'rgba(255, 204, 128, 0.12)';
                if (planet.id === 'uranus') glowColor = 'rgba(150, 224, 236, 0.12)';
                if (planet.id === 'neptune') glowColor = 'rgba(80, 142, 245, 0.15)';

                atmosGlow.addColorStop(0, glowColor);
                atmosGlow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = atmosGlow;
                ctx.beginPath();
                ctx.arc(x, y, radius * 1.15, 0, Math.PI * 2);
                ctx.fill();
              }

              // Draw beautiful text label
              if (showLabels) {
                ctx.fillStyle = selectedPlanetId === planet.id ? '#ffffff' : 'rgba(255,255,255,0.5)';
                ctx.font = selectedPlanetId === planet.id 
                  ? '600 11px system-ui' 
                  : '400 10px system-ui';
                ctx.textAlign = 'center';
                
                // Draw slightly above the planet radius
                const textYOffset = radius + 14;
                ctx.fillText(planet.name, x, y + textYOffset);

                // Distance subtext if focused or zoomed
                if (selectedPlanetId === planet.id) {
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                  ctx.font = '9px monospace';
                  ctx.fillText(`${planet.distanceFromSun} AU`, x, y + textYOffset + 11);
                }
              }
            }
          });

          // Draw Tracking indicator Reticle if selected
          if (selectedPlanetId === planet.id) {
            renderList.push({
              type: 'reticle',
              zDepth: proj.zDepth + 1, // draw exactly in front of planet
              renderFn: () => {
                const x = proj.x;
                const y = proj.y;
                let radius = planet.sizeScale;
                if (sizeMode === 'realistic') radius = planet.realSizeScale;
                radius = Math.max(3.0, radius * camera.zoom) + 6;

                // Pulsing reticle
                const pulse = 1.0 + 0.05 * Math.sin(time * 0.005);
                const size = radius * pulse;

                ctx.strokeStyle = `${planet.accentColor}dd`;
                ctx.lineWidth = 1.2;

                // Draw gorgeous neon corner brackets
                const l = size * 0.35 + 2;
                ctx.beginPath();
                // Top-Left
                ctx.moveTo(x - size, y - size + l);
                ctx.lineTo(x - size, y - size);
                ctx.lineTo(x - size + l, y - size);

                // Top-Right
                ctx.moveTo(x + size, y - size + l);
                ctx.lineTo(x + size, y - size);
                ctx.lineTo(x + size - l, y - size);

                // Bottom-Left
                ctx.moveTo(x - size, y + size - l);
                ctx.lineTo(x - size, y + size);
                ctx.lineTo(x - size + l, y + size);

                // Bottom-Right
                ctx.moveTo(x + size, y + size - l);
                ctx.lineTo(x + size, y + size);
                ctx.lineTo(x + size - l, y + size);

                ctx.stroke();

                // Faint identification tag
                ctx.fillStyle = planet.accentColor;
                ctx.font = '600 7.5px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('TARGET LOCKED', x - size - 4, y - size + 6);
              }
            });
          }
        }
      });

      // 7. SORT RENDER LIST BY DEPTH & RENDER IT
      renderList.sort((a, b) => a.zDepth - b.zDepth);
      renderList.forEach(item => item.renderFn());

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, camera, selectedPlanetId, timeSpeed, isPaused, scaleMode, sizeMode, showOrbits, showLabels, probes]);

  // Interactive mouse dragging for 3D orbital space rotation
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    // Determine hover state for pointer feedback
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hoveringPlanet = false;
    planetStatesRef.current.forEach(state => {
      const planet = PLANETS.find(p => p.id === state.id);
      if (planet) {
        let radius = planet.sizeScale;
        if (sizeMode === 'realistic') radius = planet.realSizeScale;
        radius = Math.max(3.0, radius * camera.zoom);

        const dx = clickX - state.pos2d.x;
        const dy = clickY - state.pos2d.y;
        const clickDist = Math.sqrt(dx * dx + dy * dy);
        
        // Touch target padding
        if (clickDist <= Math.max(15, radius)) {
          hoveringPlanet = true;
        }
      }
    });

    canvas.style.cursor = hoveringPlanet 
      ? 'pointer' 
      : isDraggingRef.current ? 'grabbing' : 'grab';

    if (!isDraggingRef.current) return;

    // Direct camera orbit rotation
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    setCamera(prev => {
      // Rotate Yaw horizontally (0 to 2*PI)
      let newYaw = (prev.yaw + dx * 0.007) % (Math.PI * 2);
      if (newYaw < 0) newYaw += Math.PI * 2;

      // Pitch vertically (-PI/2 to PI/2 to keep view right side up)
      const limit = Math.PI / 2 - 0.05;
      const newPitch = Math.max(-limit, Math.min(limit, prev.pitch + dy * 0.006));

      // If dragging, break key frame camera lerps to let user take control!
      targetCameraLerpRef.current = null;

      return {
        ...prev,
        yaw: newYaw,
        pitch: newPitch
      };
    });

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Click handler to select individual planets
  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let clickedPlanetId: string | null = null;
    let fallbackCloseDist = 99999;

    planetStatesRef.current.forEach(state => {
      const planet = PLANETS.find(p => p.id === state.id);
      if (planet) {
        let radius = planet.sizeScale;
        if (sizeMode === 'realistic') radius = planet.realSizeScale;
        radius = Math.max(3.0, radius * camera.zoom);

        const dx = clickX - state.pos2d.x;
        const dy = clickY - state.pos2d.y;
        const clickDist = Math.sqrt(dx * dx + dy * dy);

        // Within target boundary
        if (clickDist <= Math.max(16, radius) && clickDist < fallbackCloseDist) {
          clickedPlanetId = state.id;
          fallbackCloseDist = clickDist;
        }
      }
    });

    if (clickedPlanetId) {
      const selectedObj = PLANETS.find(p => p.id === clickedPlanetId);
      if (selectedObj) {
        onSelectPlanet(selectedObj);
      }
    } else {
      // click empty space to de-select
      onSelectPlanet(null);
    }
  };

  // Zooming with mouse wheel
  const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const isZoomIn = e.deltaY < 0;

    setCamera(prev => {
      const newZoom = isZoomIn 
        ? Math.min(4.5, prev.zoom * zoomFactor) 
        : Math.max(0.18, prev.zoom / zoomFactor);
      
      targetCameraLerpRef.current = null; // break auto zoom template
      return {
        ...prev,
        zoom: newZoom
      };
    });
  };

  // Preset view buttons
  const resetCamera = (type: 'top' | 'isometric' | 'front') => {
    targetCameraLerpRef.current = null;
    if (type === 'top') {
      setCamera(prev => ({ ...prev, pitch: 1.55, yaw: -Math.PI / 2, zoom: 0.85, offsetX: 0, offsetY: 0 }));
    } else if (type === 'isometric') {
      setCamera(prev => ({ ...prev, pitch: 0.65, yaw: -0.45, zoom: 1.0, offsetX: 0, offsetY: 0 }));
    } else if (type === 'front') {
      setCamera(prev => ({ ...prev, pitch: 0.05, yaw: -Math.PI / 2, zoom: 0.9, offsetX: 0, offsetY: 0 }));
    }
  };

  const adjustManualZoom = (direction: 'in' | 'out') => {
    targetCameraLerpRef.current = null;
    const factor = direction === 'in' ? 1.25 : 0.8;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.18, Math.min(4.5, prev.zoom * factor))
    }));
  };

  return (
    <div 
      id="solar-container"
      ref={containerRef} 
      className="relative w-full h-full min-h-[460px] bg-white/[0.02] backdrop-blur-md overflow-hidden rounded-[2rem] border border-white/20 shadow-2xl"
    >
      {/* Simulation HUD/Dashboard Overlay */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
        <h2 className="text-xl font-light tracking-tight text-white flex items-center gap-2">
          <span>Simulation Viewport</span>
          <span className="text-[9px] font-mono tracking-widest uppercase bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/20">
            Orrery 3D Active
          </span>
        </h2>
        <p className="text-[10px] font-mono text-gray-300 tracking-wider">
          DRAG TO ROTATE • SCROLL OR CLICK ACTIONS
        </p>
      </div>

      {/* Orbit/Size Control Toggles */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
        {/* Preset angles dropdown or buttons */}
        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-xl p-1 rounded-xl border border-white/15 text-xs">
          <button 
            id="btn-view-top"
            onClick={() => resetCamera('top')} 
            className="p-1.5 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition font-mono text-[10px] uppercase font-bold tracking-wider"
            title="Top down view"
          >
            Top
          </button>
          <button 
            id="btn-view-iso"
            onClick={() => resetCamera('isometric')} 
            className="p-1.5 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition font-mono text-[10px] uppercase font-bold tracking-wider"
            title="Perspective angles"
          >
            Oblique
          </button>
          <button 
            id="btn-view-side"
            onClick={() => resetCamera('front')} 
            className="p-1.5 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition font-mono text-[10px] uppercase font-bold tracking-wider"
            title="Flat horizon view"
          >
            Side
          </button>
        </div>

        {/* Manual Zoom buttons */}
        <div className="flex items-center bg-white/5 backdrop-blur-xl p-1 rounded-xl border border-white/15">
          <button 
            id="btn-zoom-in"
            onClick={() => adjustManualZoom('in')}
            className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
          <button 
            id="btn-zoom-out"
            onClick={() => adjustManualZoom('out')}
            className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main interactive Canvas */}
      <canvas
        id="solar-system-canvas"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        className="block w-full h-full touch-none select-none bg-transparent"
      />

      {/* Bottom status layout or probe trackers */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-[9px] font-mono font-bold text-gray-300 tracking-wider">AZ/EL MATRIX:</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-300 font-bold">
          P:{(camera.pitch * 57.29).toFixed(0)}° • Y:{(camera.yaw * 57.29).toFixed(0)}°
        </span>
        <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
        <span className="text-[10px] font-mono text-gray-400">
          Scale: {camera.zoom.toFixed(2)}x
        </span>
      </div>

      {/* Realistic Scale Warning/Info HUD if activated */}
      {scaleMode === 'realistic' && (
        <div className="absolute bottom-6 right-6 z-10 max-w-xs bg-white/5 border border-white/15 backdrop-blur-md p-3 rounded-xl pointer-events-none">
          <div className="flex items-start gap-2 text-[10px] font-mono">
            <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold tracking-wider text-white uppercase">True Scale Matrix</p>
              <p className="text-gray-300 leading-normal mt-1 opacity-75 text-[9px]">
                Inner orbits overlap slightly. Use scroll wheel or zoom indicators above to analyze separated planetary sectors.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
