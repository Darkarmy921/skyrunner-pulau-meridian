// config.js — tuning, missions and the ring tour for SKYRUNNER: Pulau Meridian.
// One place for every number a pilot would argue about.

const SKY_CONFIG = {
  gameName: 'SKYRUNNER: Pulau Meridian',
  planeName: 'Meridian Kestrel',
  islandRadius: 1150,
  seaLevel: 0,
  maxSpeed: 150,          // m/s at full throttle
  boostSpeed: 192,        // m/s with Shift boost
  cruiseSpeed: 95,
  stallSpeed: 34,         // m/s — below this the nose drops
  climbRate: 0.9,
  rollRate: 1.9,          // rad/s at full deflection
  pitchRate: 1.1,
  yawRate: 0.55,
  fuelBurn: 0.55,         // % per second at full throttle
  fuelCapacity: 100,
  ringScore: 250,
  landingScore: 1000,
  deliveryScore: 1500,
  deliveryTime: 90,       // seconds for the timed delivery
  landingMaxSpeedKt: 110, // knots — faster and the landing is refused
  landingMaxAltM: 25,     // metres above the runway
  landingMaxSink: 6,      // m/s vertical speed on touchdown
};

const MS_TO_KT = 1.94384;

// The ring tour: eight orange rings around the island, then the gold delivery
// ring by the northern peak. Hand-placed, so every sortie flies the same tour.
const RING_TOUR = [
  { x: 0,    y: 120, z: 150,  color: 0xff5a1f },
  { x: 260,  y: 140, z: -80,  color: 0xff5a1f },
  { x: 180,  y: 160, z: -420, color: 0xff5a1f },
  { x: -220, y: 150, z: -380, color: 0xff5a1f },
  { x: -420, y: 120, z: -40,  color: 0xff5a1f },
  { x: -280, y: 90,  z: 300,  color: 0xff5a1f },
  { x: 120,  y: 100, z: 480,  color: 0xff5a1f },
  { x: 380,  y: 130, z: 220,  color: 0xff5a1f },
];

const GOLD_RING = { x: 0, y: 175, z: -640, color: 0xffc21f };

// Runway Meridian: flat strip on the south coast, heading 090 (east).
const RUNWAY = {
  centerX: 0, centerZ: 650,
  length: 520, width: 30,
  headingDeg: 90,
  surfaceY: 4,
};

const MISSIONS = [
  { id: 'rings',    title: 'MISSION 1 — RING RUN',     brief: 'Fly through all 8 orange rings. +250 each.' },
  { id: 'landing',  title: 'MISSION 2 — LANDING',      brief: 'Land on Runway Meridian: speed under 110 kt, altitude under 25 m. +1000.' },
  { id: 'delivery', title: 'MISSION 3 — TIMED DELIVERY', brief: 'Reach the gold ring by the north peak before the timer runs out. +1500.' },
  { id: 'free',     title: 'FREE FLIGHT',              brief: 'Sortie complete. The island is yours — fly it.' },
];
