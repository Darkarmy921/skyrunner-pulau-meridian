// rng.js — deterministic seeded random numbers for SKYRUNNER: Pulau Meridian.
// Every random choice in the game comes from here, so the island, clouds and
// rings are identical on every load. No Math.random, no wall clock.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise2D(seed) {
  const rand = mulberry32(seed);
  const size = 64;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  function at(ix, iz) {
    const x = ((ix % size) + size) % size;
    const z = ((iz % size) + size) % size;
    return grid[z * size + x];
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  // Value noise: bilinear blend of the four nearest grid corners.
  function noise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = smooth(x - ix), fz = smooth(z - iz);
    const a = at(ix, iz), b = at(ix + 1, iz);
    const c = at(ix, iz + 1), d = at(ix + 1, iz + 1);
    return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz);
  }
  // Three octaves of value noise, normalised to 0..1.
  function fbm(x, z) {
    return (noise(x, z) * 0.55 + noise(x * 2.13, z * 2.13) * 0.3 + noise(x * 4.31, z * 4.31) * 0.15);
  }
  return { noise: noise, fbm: fbm };
}
