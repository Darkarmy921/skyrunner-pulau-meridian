// shots.js — staged states for the four screenshots.
// Each shot is a real game state (position, speed, mission, camera) frozen
// mid-flight so the render is stable: cover, cockpit, low pass, landing.
// ?shot=cover|cockpit|lowpass|landing — any other value plays normally.

function applyShot(name, game) {
  const s = game.state;
  if (name === 'cover') {
    s.pos.set(0, 126, 270); s.heading = 0; s.pitch = -0.02; s.roll = 0.08;
    s.speed = 68; s.throttle = 0.62; s.fuel = 82; s.damage = 0;
    s.score = 250; s.ringsPassed = 1;
    game.missionIndex = 0; game.cameraMode = 'chase';
    game.shotMessage = 'RING 2 AHEAD — FLY THROUGH THE ORANGE RING';
    return 'cover';
  }
  if (name === 'cockpit') {
    s.pos.set(0, 138, 290); s.heading = 0; s.pitch = 0; s.roll = -0.05;
    s.speed = 76; s.throttle = 0.7; s.fuel = 78; s.damage = 0;
    s.score = 250; s.ringsPassed = 1;
    game.missionIndex = 0; game.cameraMode = 'cockpit';
    game.shotMessage = 'RING 2 AHEAD — THROUGH THE WINDSHIELD';
    return 'cockpit';
  }
  if (name === 'lowpass') {
    // Beach run on the west coast: sand and low scrub under the plane,
    // island rising ahead. (Terrain here is ~6 m, so 16 m is a true low pass.)
    s.pos.set(-980, 16, 200); s.heading = -Math.PI / 2; s.pitch = 0.02; s.roll = 0.10;
    s.speed = 85; s.throttle = 0.78; s.fuel = 64; s.damage = 0;
    s.score = 500; s.ringsPassed = 2;
    game.missionIndex = 0; game.cameraMode = 'chase';
    game.shotMessage = 'LOW PASS — BEACH RUN, WATCH THE WAVES';
    return 'lowpass';
  }
  if (name === 'landing') {
    s.pos.set(-330, 24, RUNWAY.centerZ); s.heading = -Math.PI / 2; s.pitch = -0.06; s.roll = 0;
    s.speed = 50; s.throttle = 0.3; s.fuel = 41; s.damage = 0;
    s.score = 2000; s.ringsPassed = 8;
    game.missionIndex = 1; game.cameraMode = 'chase';
    game.shotMessage = 'FINAL — RUNWAY MERIDIAN AHEAD, GEAR DOWN';
    return 'landing';
  }
  return null;
}
