export interface Moon {
  name: string;
  distance: number; // visual offset for mini viewer
  size: number;     // visual radius
  speed: number;    // orbital speed in mini viewer
}

export interface InternalLayer {
  name: string;
  thickness: string;
  composition: string;
  color: string;
}

export interface AtmosphereGas {
  gas: string;
  percentage: string;
}

export interface PlanetData {
  id: string;
  name: string;
  type: 'planet' | 'dwarf';
  mass: string;          // e.g. "5.97 x 10^24 kg"
  gravity: number;       // m/s^2 (e.g. 9.81)
  diameter: number;      // km
  tempRange: string;     // e.g. "-88°C to 58°C"
  orbitalPeriod: string; // e.g. "365.25 Days"
  rotationPeriod: string;// e.g. "23.9 Hours"
  distanceFromSun: number;// Mean distance in AU
  realDistanceMillionKm: number;
  moons: Moon[];
  description: string;
  funFacts: string[];
  atmosphere: AtmosphereGas[];
  structure: InternalLayer[];
  
  // Graphical Properties
  color: string;
  accentColor: string;
  texturePattern: 'solid' | 'bands' | 'spots' | 'rocky' | 'craters';
  ringColor?: string;
  ringRadiusInner?: number;
  ringRadiusOuter?: number;
  orbitalSpeed: number; // Visual speed parameter
  sizeScale: number;    // Visual relative size size radius pixel scale (for visual mode)
  realSizeScale: number;// Real relative size size radius pixel scale (for real scale mode)
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PlanetState {
  id: string;
  currentAngle: number; // base radian orbit angle
  pos3d: Vector3D;      // calculated 3D coordinates
  pos2d: { x: number; y: number; zDepth: number }; // projected coordinates
}

export interface SpaceProbe {
  planetId: string;
  targetPlanetId: string;
  progress: number; // 0 to 1
  currentPos: Vector3D;
  trail: Vector3D[];
  status: 'launching' | 'cruising' | 'arriving' | 'orbiting' | 'landed';
}

export interface CameraConfig {
  pitch: number;    // X-axis rotation angle (pitch up/down, -PI/2 to PI/2)
  yaw: number;      // Y-axis rotation angle (yaw left/right, 0 to 2*PI)
  zoom: number;     // zoom factor (0.1 to 5)
  offsetX: number;  // pan center X
  offsetY: number;  // pan center Y
}
