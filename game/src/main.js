// main.js — SKYRUNNER: Pulau Meridian. Boots the scene, runs the loop,
// flies the missions: Ring Run, Landing, Timed Delivery, then free flight.

const game = {
  state: newFlightState(),
  missionIndex: 0,
  cameraMode: 'chase',
  shotMode: null,
  shotMessage: '',
  timer: null,
  message: '',
  messageUntil: 0,
  muted: false,
  started: false,
  time: 0,
  camYaw: 0,
  camPitch: 0,
};

let scene, camera, renderer, plane, world, input, fx, particles, particlePool;

function showMessage(text, seconds) {
  game.message = text;
  game.messageUntil = game.time + (seconds || 4);
}

function makeParticles(scene) {
  const count = 240;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffc21f, size: 2.4, transparent: true, opacity: 0.95 });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  const pool = [];
  for (let i = 0; i < count; i++) pool.push({ life: 0, vx: 0, vy: 0, vz: 0 });
  return { points: points, pool: pool, pos: pos };
}

function burst(at, color) {
  particles.points.material.color.setHex(color);
  let spawned = 0;
  for (let i = 0; i < particles.pool.length && spawned < 60; i++) {
    const p = particles.pool[i];
    if (p.life > 0) continue;
    p.life = 0.9;
    particles.pos[i * 3] = at.x; particles.pos[i * 3 + 1] = at.y; particles.pos[i * 3 + 2] = at.z;
    p.vx = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 24;
    p.vy = (Math.sin(i * 78.233) * 12543.1234 % 1) * 18 + 8;
    p.vz = (Math.sin(i * 37.719) * 9876.5432 % 1) * 24;
    spawned++;
  }
}

function stepParticles(dt) {
  for (let i = 0; i < particles.pool.length; i++) {
    const p = particles.pool[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    particles.pos[i * 3] += p.vx * dt;
    particles.pos[i * 3 + 1] += p.vy * dt;
    particles.pos[i * 3 + 2] += p.vz * dt;
    p.vy -= 12 * dt;
    if (p.life <= 0) particles.pos[i * 3 + 1] = -9999;
  }
  particles.points.geometry.attributes.position.needsUpdate = true;
}

function nextRingTarget() {
  if (game.missionIndex === 0) return world.rings[game.state.ringsPassed] || null;
  if (game.missionIndex === 2) return world.rings[world.rings.length - 1];
  return null;
}

function checkRingPass() {
  const target = nextRingTarget();
  if (!target || target.passed) return;
  const d = game.state.pos.distanceTo(target.mesh.position);
  if (d < 17) {
    target.passed = true;
    target.mesh.material.color.setHex(0x37d67a);
    target.disc.material.color.setHex(0x37d67a);
    burst(target.mesh.position, target.def.color);
    fx.ring();
    if (game.missionIndex === 0) {
      game.state.ringsPassed++;
      game.state.score += SKY_CONFIG.ringScore;
      if (game.state.ringsPassed >= 8) {
        game.missionIndex = 1;
        showMessage('RING RUN COMPLETE — NOW LAND ON RUNWAY MERIDIAN', 6);
      } else {
        showMessage('RING ' + game.state.ringsPassed + ' / 8 — +' + SKY_CONFIG.ringScore, 3);
      }
    } else if (game.missionIndex === 2) {
      game.state.score += SKY_CONFIG.deliveryScore;
      game.missionIndex = 3;
      game.timer = null;
      showMessage('DELIVERY COMPLETE — +' + SKY_CONFIG.deliveryScore + ' — SORTIE COMPLETE!', 6);
      fx.landing();
    }
  }
}

function checkLanding() {
  const s = game.state;
  if (game.missionIndex !== 1 || !s.landed) return;
  // Touchdown on the strip during the landing mission.
  s.score += SKY_CONFIG.landingScore;
  s.fuel = SKY_CONFIG.fuelCapacity;
  showMessage('LANDED — RUNWAY MERIDIAN — +' + SKY_CONFIG.landingScore + ' — FUEL REFILLED', 6);
  fx.landing();
  burst(new THREE.Vector3(s.pos.x, s.pos.y + 2, s.pos.z), 0x37d67a);
  game.missionIndex = 2;
  game.timer = SKY_CONFIG.deliveryTime;
  s.landed = false;
  s.onGround = false;
  // Taxi off: lift back into the air for the delivery leg, heading east
  // along the runway so the climb clears the island, not the hills.
  s.pos.y = RUNWAY.surfaceY + 26;
  s.speed = 70;
  s.heading = -Math.PI / 2;
  s.pitch = 0.08;
}

function updateCamera(dt) {
  const s = game.state;
  const mouse = input.consumeMouse();
  game.camYaw = Math.max(-0.6, Math.min(0.6, game.camYaw - mouse.dx * 0.002));
  game.camPitch = Math.max(-0.25, Math.min(0.3, game.camPitch - mouse.dy * 0.002));
  const forward = new THREE.Vector3(-Math.sin(s.heading), 0, -Math.cos(s.heading));
  if (game.cameraMode === 'cockpit') {
    // In the cockpit: camera just ahead of the canopy, over the nose, so the
    // cowl and the spinning prop sit at the bottom of the frame and the ring
    // ahead shows through the windshield.
    const eye = s.pos.clone().addScaledVector(forward, 2.4);
    eye.y += 1.7;
    camera.position.copy(eye);
    const look = s.pos.clone().addScaledVector(forward, 60);
    look.y += Math.sin(s.pitch) * 60;
    camera.lookAt(look);
    camera.rotation.z += s.roll * 0.35;
  } else {
    // Chase: behind and above, smoothed, never under the terrain.
    // In a staged shot (or when far off) snap straight there so the first
    // rendered frame already frames the plane.
    const back = s.pos.clone().addScaledVector(forward, -16);
    back.y = s.pos.y + 5.2;
    const ground = terrainHeight(back.x, back.z);
    if (back.y < ground + 3) back.y = ground + 3;
    if (game.shotMode || camera.position.distanceTo(back) > 60) camera.position.copy(back);
    else camera.position.lerp(back, Math.min(1, 8 * dt));
    // Mouse orbit: look slightly around the plane without fighting it.
    const look = s.pos.clone().addScaledVector(forward, 40);
    look.y += Math.sin(s.pitch) * 40 + game.camPitch * 30;
    camera.lookAt(look);
  }
  // Next-ring beacon: point the chase camera's attention with a HUD arrow.
  const target = nextRingTarget();
  const arrow = document.getElementById('hud-arrow');
  if (target && game.cameraMode === 'chase' && !game.shotMode) {
    const dx = target.mesh.position.x - s.pos.x;
    const dz = target.mesh.position.z - s.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const ang = Math.atan2(-dx, -dz) - s.heading;
    arrow.style.display = 'block';
    arrow.textContent = '◀ RING ' + Math.round(dist) + 'm ▶';
    arrow.style.opacity = String(0.55 + 0.45 * Math.abs(Math.sin(ang)));
  } else {
    arrow.style.display = 'none';
  }
}

function stepGame(dt) {
  const s = game.state;
  const edges = input.consumeEdges();
  if (edges.camera) {
    game.cameraMode = game.cameraMode === 'chase' ? 'cockpit' : 'chase';
    document.getElementById('cockpit').style.display = game.cameraMode === 'cockpit' ? 'block' : 'none';
    showMessage(game.cameraMode === 'cockpit' ? 'COCKPIT VIEW' : 'CHASE VIEW', 2);
  }
  if (edges.mute) { game.muted = !game.muted; }
  if (edges.restart || (s.crashed && input.throttleUp)) {
    resetFlight(s);
    game.missionIndex = 0; game.timer = null; game.message = ''; game.endShown = false;
    for (const r of world.rings) { r.passed = false; r.mesh.material.color.setHex(r.def.color); r.disc.material.color.setHex(r.def.color); }
    document.getElementById('overlay-end').style.display = 'none';
    showMessage('SORTIE RESET — RING RUN: 8 RINGS', 4);
  }
  if (game.shotMode) {
    // Frozen staged state: prop spins, world breathes, nothing else moves.
    updatePlaneVisual(plane, s, dt);
    return;
  }
  if (!game.started) return;
  const wasLanded = s.landed;
  stepFlight(s, input, dt);
  updatePlaneVisual(plane, s, dt);
  checkRingPass();
  if (s.landed && !wasLanded) checkLanding();
  if (s.crashed && !game.endShown) {
    game.endShown = true;
    fx.crash();
    burst(s.pos, 0xff4422);
    showMessage('CRASHED — press R to fly again', 8);
    document.getElementById('overlay-end').style.display = 'flex';
    document.getElementById('end-title').textContent = 'CRASHED';
    document.getElementById('end-score').textContent = 'Score ' + s.score + ' — Rings ' + s.ringsPassed + '/8';
  }
  if (game.missionIndex === 2 && game.timer !== null) {
    game.timer -= dt;
    if (game.timer <= 0) {
      game.timer = null;
      game.missionIndex = 3;
      showMessage('DELIVERY WINDOW MISSED — FREE FLIGHT', 5);
    }
  }
  if (game.missionIndex === 1 && s.pos.y < RUNWAY.surfaceY + 40 &&
      Math.abs(s.pos.x) < RUNWAY.length / 2 + 120 && Math.abs(s.pos.z - RUNWAY.centerZ) < 120 &&
      s.speed * MS_TO_KT > SKY_CONFIG.landingMaxSpeedKt && !s.landed && !s.crashed) {
    showMessage('TOO FAST TO LAND — GO AROUND!', 2);
    if (Math.floor(game.time * 2) % 4 === 0) fx.warning();
  }
  fx.engine(game.muted ? 0 : s.throttle, s.speed);
}

function renderHUD() {
  const s = game.state;
  const mission = MISSIONS[game.missionIndex];
  const msg = game.shotMode ? game.shotMessage : (game.time < game.messageUntil ? game.message : '');
  updateHUD(s, mission, game.missionIndex === 2 ? game.timer : null, msg);
  // In the cockpit the panel replaces the chase HUD corners.
  const cockpit = game.cameraMode === 'cockpit';
  document.getElementById('hud-left').style.display = cockpit ? 'none' : 'flex';
  document.getElementById('hud-help').style.display = cockpit ? 'none' : 'block';
  if (cockpit) drawCockpitPanel(s);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, 0.016);
  game.time += dt;
  // Clouds drift slowly on the wind.
  for (const c of world.sky.clouds) { c.position.x += dt * 1.2; if (c.position.x > 1800) c.position.x = -1800; }
  stepGame(dt);
  stepParticles(dt);
  updateCamera(dt);
  renderHUD();
  renderer.render(scene, camera);
}

function startOverlay() {
  document.getElementById('overlay-start').style.display = 'none';
  game.started = true;
  fx.unlock();
  showMessage('RING RUN — FLY THROUGH THE 8 ORANGE RINGS', 5);
}

function boot() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 9000);
  camera.position.set(0, 140, 460);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('scene').appendChild(renderer.domElement);

  world = buildWorld(scene);
  plane = buildPlane();
  scene.add(plane);
  particles = makeParticles(scene);
  input = makeInput();
  fx = makeSoundFX();

  // Screenshot staging from the URL: ?shot=cover|cockpit|lowpass|landing
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    const applied = applyShot(shot, game);
    if (applied) {
      game.shotMode = applied;
      game.started = true;
      document.getElementById('overlay-start').style.display = 'none';
      if (game.cameraMode === 'cockpit') document.getElementById('cockpit').style.display = 'block';
      updatePlaneVisual(plane, game.state, 0.016);
    }
  }

  document.getElementById('overlay-start').addEventListener('click', startOverlay);
  window.addEventListener('keydown', function (e) {
    if ((e.code === 'Enter' || e.code === 'Space') && !game.started && !game.shotMode) startOverlay();
  });
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  animate();
}

window.addEventListener('load', boot);
