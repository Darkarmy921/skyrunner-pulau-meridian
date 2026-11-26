// world.js — Pulau Meridian: terrain, sea, sky, runway, rings and airfield.
// Builds the whole island from the seeded noise in rng.js. The terrain height
// function here is also the collision ground for physics.js.

const noise2d = makeNoise2D(20261126);

function islandFalloff(x, z) {
  const d = Math.sqrt(x * x + z * z) / SKY_CONFIG.islandRadius;
  if (d >= 1) return 0;
  return Math.pow(1 - d * d, 1.4);
}

function terrainHeight(x, z) {
  const fall = islandFalloff(x, z);
  if (fall <= 0) return -6; // seabed
  const hills = noise2d.fbm(x * 0.0016 + 7.3, z * 0.0016 + 2.9);
  let h = hills * 95 * fall;
  // Northern peak: Gunung Meridian, the island's landmark.
  const peakD = Math.sqrt(x * x + (z + 640) * (z + 640));
  h += 150 * Math.exp(-(peakD * peakD) / (2 * 260 * 260));
  // Flatten the airfield shelf on the south coast for the runway.
  const rwD = Math.sqrt(x * x + (z - RUNWAY.centerZ) * (z - RUNWAY.centerZ));
  const shelf = Math.exp(-(rwD * rwD) / (2 * 300 * 300));
  h = h * (1 - shelf) + RUNWAY.surfaceY * shelf;
  return h;
}

function terrainColor(h, slope) {
  if (h < 2.5) return [0.86, 0.78, 0.55];   // sand beach
  if (h < 55) return slope > 0.55 ? [0.42, 0.48, 0.30] : [0.23, 0.48, 0.20]; // grass / scrub
  if (h < 120) return [0.16, 0.38, 0.16];  // jungle green
  return [0.55, 0.52, 0.48];               // bare rock near the peak
}

function buildTerrain(scene) {
  const size = 2600, seg = 110;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    // Slope from a neighbour sample, for rock vs grass.
    const slope = Math.abs(terrainHeight(x + 8, z) - h) / 8 + Math.abs(terrainHeight(x, z + 8) - h) / 8;
    const c = terrainColor(h, slope);
    colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'terrain';
  scene.add(mesh);
  return mesh;
}

function buildSea(scene) {
  const geo = new THREE.PlaneGeometry(9000, 9000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhongMaterial({ color: 0x1b6fb0, shininess: 90, specular: 0x99ccff });
  const sea = new THREE.Mesh(geo, mat);
  sea.position.y = SKY_CONFIG.seaLevel;
  sea.name = 'sea';
  scene.add(sea);
  return sea;
}

function buildSky(scene) {
  scene.background = new THREE.Color(0x87c5e8);
  scene.fog = new THREE.Fog(0x9fd0ea, 900, 4200);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.15);
  sun.position.set(600, 900, 300);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ee, 0.75));
  // Sun disc + a few flat clouds, all from the seeded rng.
  const sunMesh = new THREE.Mesh(
    new THREE.CircleGeometry(55, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false })
  );
  sunMesh.position.set(1400, 780, -1900);
  sunMesh.lookAt(0, 0, 0);
  scene.add(sunMesh);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  const rand = mulberry32(77);
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(18 + rand() * 22, 10, 8), cloudMat);
      s.position.set((rand() - 0.5) * 90, (rand() - 0.5) * 10, (rand() - 0.5) * 30);
      s.scale.y = 0.55;
      group.add(s);
    }
    group.position.set((rand() - 0.5) * 3400, 260 + rand() * 160, (rand() - 0.5) * 3400);
    scene.add(group);
    clouds.push(group);
  }
  return { clouds: clouds };
}

function buildRunway(scene) {
  const g = new THREE.Group();
  g.name = 'runway-meridian';
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.length, 1.2, RUNWAY.width),
    new THREE.MeshLambertMaterial({ color: 0x3a3f45 })
  );
  strip.position.set(RUNWAY.centerX, RUNWAY.surfaceY, RUNWAY.centerZ);
  g.add(strip);
  // White centreline dashes.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let x = -RUNWAY.length / 2 + 20; x < RUNWAY.length / 2 - 10; x += 40) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 2.2), dashMat);
    dash.position.set(x, RUNWAY.surfaceY + 0.8, RUNWAY.centerZ);
    g.add(dash);
  }
  // Threshold bars at both ends.
  for (const end of [-1, 1]) {
    for (let k = -2; k <= 2; k++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 4), dashMat);
      bar.position.set(end * (RUNWAY.length / 2 - 14), RUNWAY.surfaceY + 0.8, RUNWAY.centerZ + k * 5);
      g.add(bar);
    }
  }
  // Green edge lights — the "runway hijau" the pilot aims for.
  const lightGeo = new THREE.SphereGeometry(1.1, 8, 6);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x2eff7a });
  for (let x = -RUNWAY.length / 2; x <= RUNWAY.length / 2; x += 32) {
    for (const side of [-1, 1]) {
      const l = new THREE.Mesh(lightGeo, lightMat);
      l.position.set(x, RUNWAY.surfaceY + 1.2, RUNWAY.centerZ + side * (RUNWAY.width / 2 + 2));
      g.add(l);
    }
  }
  scene.add(g);
  // Airfield buildings: hangar, tower, windsock.
  const hangar = new THREE.Mesh(
    new THREE.BoxGeometry(46, 16, 30),
    new THREE.MeshLambertMaterial({ color: 0xd86a2a })
  );
  hangar.position.set(-40, RUNWAY.surfaceY + 8, RUNWAY.centerZ + 55);
  scene.add(hangar);
  const tower = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(8, 34, 8), new THREE.MeshLambertMaterial({ color: 0xe8e4da }));
  shaft.position.y = 17;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 14), new THREE.MeshPhongMaterial({ color: 0x2a6ea8, shininess: 60 }));
  cab.position.y = 38;
  tower.add(shaft); tower.add(cab);
  tower.position.set(120, RUNWAY.surfaceY, RUNWAY.centerZ + 48);
  scene.add(tower);
  const sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
  sockPole.position.set(200, RUNWAY.surfaceY + 6, RUNWAY.centerZ - 30);
  scene.add(sockPole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 8), new THREE.MeshLambertMaterial({ color: 0xff7a1f }));
  sock.rotation.z = Math.PI / 2;
  sock.position.set(205, RUNWAY.surfaceY + 11, RUNWAY.centerZ - 30);
  scene.add(sock);
  return g;
}

function buildRings(scene) {
  const rings = [];
  function makeRing(def, radius, tube) {
    const geo = new THREE.TorusGeometry(radius, tube, 12, 40);
    const mat = new THREE.MeshBasicMaterial({ color: def.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(def.x, def.y, def.z);
    mesh.name = 'ring';
    scene.add(mesh);
    // Inner glow disc so the ring reads at distance.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.92, 32),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.10, side: THREE.DoubleSide })
    );
    disc.position.copy(mesh.position);
    scene.add(disc);
    rings.push({ def: def, mesh: mesh, disc: disc, passed: false });
  }
  for (const def of RING_TOUR) makeRing(def, 16, 2.2);
  makeRing(GOLD_RING, 20, 2.6);
  return rings;
}

function buildTrees(scene) {
  const rand = mulberry32(4242);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x1e6b2a });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x2f8f3a });
  const trunkGeo = new THREE.CylinderGeometry(0.7, 1.0, 5, 6);
  const leafGeo = new THREE.ConeGeometry(4.5, 13, 8);
  let placed = 0, tries = 0;
  while (placed < 150 && tries < 900) {
    tries++;
    const x = (rand() - 0.5) * 2100, z = (rand() - 0.5) * 2100;
    const h = terrainHeight(x, z);
    if (h < 5 || h > 70) continue;
    if (Math.abs(z - RUNWAY.centerZ) < 70 && Math.abs(x) < 340) continue; // keep the airfield clear
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.5;
    const leaves = new THREE.Mesh(leafGeo, placed % 2 ? leafMat : leafMat2);
    leaves.position.y = 10;
    tree.add(trunk); tree.add(leaves);
    const s = 0.8 + rand() * 0.9;
    tree.scale.setScalar(s);
    tree.position.set(x, h, z);
    scene.add(tree);
    placed++;
  }
  // A few white houses with orange roofs by the airfield road.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xf2ede2 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xd86a2a });
  for (let i = 0; i < 6; i++) {
    const hx = -180 + i * 62, hz = RUNWAY.centerZ + 95;
    const hy = terrainHeight(hx, hz);
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 10), wallMat);
    walls.position.y = 3.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 4.5, 4), roofMat);
    roof.position.y = 9.2; roof.rotation.y = Math.PI / 4;
    house.add(walls); house.add(roof);
    house.position.set(hx, hy, hz);
    scene.add(house);
  }
}

function buildWorld(scene) {
  buildTerrain(scene);
  buildSea(scene);
  const sky = buildSky(scene);
  buildRunway(scene);
  buildTrees(scene);
  const rings = buildRings(scene);
  return { sky: sky, rings: rings };
}
