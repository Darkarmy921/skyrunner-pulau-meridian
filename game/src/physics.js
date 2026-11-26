// physics.js — arcade flight model for the Kestrel.
// Throttle sets the speed the plane chases; bank turns it; pitch climbs or
// dives. Stall, crash and landing are all decided here, in the open.

function newFlightState() {
  return {
    pos: new THREE.Vector3(0, 130, 420),
    heading: 0,         // facing north (-Z) toward ring 1
    pitch: 0,           // nose up positive
    roll: 0,
    speed: 95,          // m/s
    throttle: 0.62,
    fuel: SKY_CONFIG.fuelCapacity,
    damage: 0,
    score: 0,
    ringsPassed: 0,
    verticalSpeed: 0,
    engineOut: false,
    crashed: false,
    landed: false,
    onGround: false,
    stallWarning: false,
    goAround: false,
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function stepFlight(state, input, dt) {
  if (state.crashed) return;
  const cfg = SKY_CONFIG;

  // Throttle: W/S, Shift boost, Space brake.
  state.throttle = clamp(state.throttle + (input.throttleUp ? 0.55 : 0) * dt + (input.throttleDown ? -0.7 : 0) * dt, 0, 1);
  let targetSpeed = state.throttle * cfg.maxSpeed;
  if (input.boost && state.fuel > 0) targetSpeed = cfg.boostSpeed;
  if (input.brake) targetSpeed = Math.min(targetSpeed, 28);
  // Engine-out glide when the tank is dry.
  state.engineOut = state.fuel <= 0;
  if (state.engineOut) targetSpeed = Math.min(targetSpeed, 55);
  state.speed += (targetSpeed - state.speed) * Math.min(1, 0.55 * dt);

  // Roll (A/D) and pitch (arrows): control answers at every speed.
  const rollInput = (input.rollLeft ? 1 : 0) - (input.rollRight ? 1 : 0);
  const pitchInput = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
  const authority = 0.45 + 0.55 * clamp(state.speed / 80, 0, 1);
  state.roll = clamp(state.roll + rollInput * cfg.rollRate * authority * dt, -1.25, 1.25);
  state.roll *= Math.pow(0.25, dt * 0.35); // gentle auto-level when no input
  if (Math.abs(rollInput) < 0.01) state.roll *= Math.pow(0.2, dt);
  state.pitch = clamp(state.pitch + pitchInput * cfg.pitchRate * authority * dt, -0.65, 0.65);
  // Yaw (Q/E): small heading trim, and a touch of adverse-yaw feel.
  const yawInput = (input.yawLeft ? 1 : 0) - (input.yawRight ? 1 : 0);
  state.heading += yawInput * cfg.yawRate * dt;

  // Bank turns the plane: heading rate grows with bank and speed.
  state.heading += -Math.sin(state.roll) * (state.speed / 95) * 0.85 * dt;

  // Stall: below stall speed the nose drops and the wing stops answering.
  state.stallWarning = state.speed < cfg.stallSpeed + 8 && !state.onGround;
  if (state.speed < cfg.stallSpeed) state.pitch = Math.max(state.pitch - 0.5 * dt, -0.5);

  // Move: forward along heading/pitch, vertical speed from pitch.
  const forward = new THREE.Vector3(-Math.sin(state.heading), 0, -Math.cos(state.heading));
  state.verticalSpeed = Math.sin(state.pitch) * state.speed * cfg.climbRate;
  state.pos.addScaledVector(forward, Math.cos(state.pitch) * state.speed * dt);
  state.pos.y += state.verticalSpeed * dt;

  // Fuel: throttle burns it, boost burns double.
  if (!state.onGround) {
    state.fuel = Math.max(0, state.fuel - cfg.fuelBurn * (0.25 + state.throttle) * (input.boost ? 2 : 1) * dt);
  }

  // Ground: terrain, sea and the runway.
  const ground = terrainHeight(state.pos.x, state.pos.z);
  const overRunway = Math.abs(state.pos.x - RUNWAY.centerX) < RUNWAY.length / 2 &&
    Math.abs(state.pos.z - RUNWAY.centerZ) < RUNWAY.width / 2;
  const groundY = overRunway ? RUNWAY.surfaceY : ground;
  if (state.pos.y > groundY + 5) {
    // Airborne again: clear the touchdown flags so the next landing counts.
    state.landed = false;
    state.onGround = false;
  }
  if (state.pos.y <= groundY + 1.6) {
    const sink = -state.verticalSpeed;
    const speedKt = state.speed * MS_TO_KT;
    if (overRunway && speedKt < cfg.landingMaxSpeedKt && sink < cfg.landingMaxSink && Math.abs(state.roll) < 0.35) {
      // A real landing: wheels on the strip, slow enough, gentle enough.
      state.onGround = true;
      state.landed = true;
      state.pos.y = groundY + 1.6;
      state.speed = Math.max(0, state.speed - 60 * dt);
      state.pitch = 0; state.roll = 0;
      if (state.speed < 2) state.speed = 0;
    } else if (state.pos.y < groundY + 0.4) {
      state.crashed = true;
      state.damage = 100;
      state.pos.y = groundY + 0.4;
    } else {
      state.pos.y = groundY + 1.6;
    }
  }
  // Ceiling.
  if (state.pos.y > 620) { state.pos.y = 620; state.pitch = Math.min(state.pitch, 0); }
  // Soft island bounds: turn back gently past 2400 m out.
  const dist = Math.sqrt(state.pos.x * state.pos.x + state.pos.z * state.pos.z);
  if (dist > 2400) {
    const back = Math.atan2(-state.pos.x, -state.pos.z);
    let diff = back - state.heading;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    state.heading += clamp(diff, -1, 1) * 0.4 * dt;
  }
}

function resetFlight(state) {
  const fresh = newFlightState();
  for (const k of Object.keys(fresh)) state[k] = fresh[k];
}
