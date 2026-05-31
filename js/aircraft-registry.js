/**
 * Aircraft Registry
 * Add your own .glb/.gltf models to the /models/ folder
 * and register them here.
 */

const AIRCRAFT_REGISTRY = [
  // ── Built-in primitive aircraft (no external model needed) ──
  {
    id: 'cessna172',
    name: 'CESSNA 172',
    type: 'General Aviation',
    icon: '🛩',
    model: null,   // Uses primitive shape fallback
    scale: 1.0,
    // Flight envelope
    maxSpeed: 130,       // kts
    stallSpeed: 48,
    climbRate: 700,      // fpm
    maxAltitude: 14000,  // ft
    maxBank: 60,
    maxPitch: 30,
    mass: 1,
    dragCoeff: 0.028,
    liftCoeff: 1.2,
    thrustMax: 160,      // horsepower-equivalent
    color: Cesium.Color.WHITE,
    dimensions: { length: 8.3, span: 11.0, height: 2.7 }
  },
  {
    id: 'boeing737',
    name: 'BOEING 737',
    type: 'Airliner',
    icon: '✈',
    model: null,
    scale: 2.5,
    maxSpeed: 470,
    stallSpeed: 130,
    climbRate: 2500,
    maxAltitude: 41000,
    maxBank: 67,
    maxPitch: 25,
    mass: 5,
    dragCoeff: 0.018,
    liftCoeff: 1.8,
    thrustMax: 2 * 121000, // 2× CFM56 N
    color: Cesium.Color.LIGHTBLUE,
    dimensions: { length: 39.5, span: 35.7, height: 12.5 }
  },
  {
    id: 'f16',
    name: 'F-16 FALCON',
    type: 'Fighter',
    icon: '🚀',
    model: null,
    scale: 1.2,
    maxSpeed: 1500,
    stallSpeed: 120,
    climbRate: 50000,
    maxAltitude: 60000,
    maxBank: 90,
    maxPitch: 90,
    mass: 2,
    dragCoeff: 0.012,
    liftCoeff: 2.0,
    thrustMax: 130000,
    color: Cesium.Color.LIGHTGRAY,
    dimensions: { length: 15.0, span: 9.4, height: 4.8 }
  },
  {
    id: 'concorde',
    name: 'CONCORDE',
    type: 'Supersonic',
    icon: '⚡',
    model: null,
    scale: 2.2,
    maxSpeed: 1354,
    stallSpeed: 160,
    climbRate: 5000,
    maxAltitude: 60000,
    maxBank: 45,
    maxPitch: 20,
    mass: 4,
    dragCoeff: 0.010,
    liftCoeff: 1.6,
    thrustMax: 4 * 169000,
    color: Cesium.Color.WHITE,
    dimensions: { length: 61.7, span: 25.6, height: 12.2 }
  },
  // ── Custom uploaded models (add your .glb files to /models/) ──
  {
    id: 'custom1',
    name: 'CUSTOM MODEL 1',
    type: 'User Model',
    icon: '📦',
    model: 'models/aircraft1.glb',   // ← change to your filename
    scale: 1.0,
    maxSpeed: 350,
    stallSpeed: 80,
    climbRate: 2000,
    maxAltitude: 35000,
    maxBank: 60,
    maxPitch: 30,
    mass: 3,
    dragCoeff: 0.022,
    liftCoeff: 1.5,
    thrustMax: 200000,
    color: Cesium.Color.WHITE,
    dimensions: { length: 20, span: 18, height: 6 }
  },
  {
    id: 'custom2',
    name: 'CUSTOM MODEL 2',
    type: 'User Model',
    icon: '📦',
    model: 'models/aircraft2.glb',   // ← change to your filename
    scale: 1.0,
    maxSpeed: 350,
    stallSpeed: 80,
    climbRate: 2000,
    maxAltitude: 35000,
    maxBank: 60,
    maxPitch: 30,
    mass: 3,
    dragCoeff: 0.022,
    liftCoeff: 1.5,
    thrustMax: 200000,
    color: Cesium.Color.WHITE,
    dimensions: { length: 20, span: 18, height: 6 }
  },
  {
    id: 'custom3',
    name: 'CUSTOM MODEL 3',
    type: 'User Model',
    icon: '📦',
    model: 'models/aircraft3.glb',   // ← change to your filename
    scale: 1.0,
    maxSpeed: 350,
    stallSpeed: 80,
    climbRate: 2000,
    maxAltitude: 35000,
    maxBank: 60,
    maxPitch: 30,
    mass: 3,
    dragCoeff: 0.022,
    liftCoeff: 1.5,
    thrustMax: 200000,
    color: Cesium.Color.WHITE,
    dimensions: { length: 20, span: 18, height: 6 }
  },
];

// Spawn locations
const SPAWN_LOCATIONS = {
  kennedy: { lat: 40.6413, lon: -73.7781, name: 'JFK — New York', heading: 31 },
  heathrow: { lat: 51.4700, lon: -0.4543, name: 'LHR — London', heading: 270 },
  dubai: { lat: 25.2532, lon: 55.3657, name: 'DXB — Dubai', heading: 120 },
  sydney: { lat: -33.9399, lon: 151.1753, name: 'SYD — Sydney', heading: 160 },
  tokyo: { lat: 35.5494, lon: 139.7798, name: 'HND — Tokyo', heading: 340 },
  paris: { lat: 49.0097, lon: 2.5479, name: 'CDG — Paris', heading: 270 },
};
