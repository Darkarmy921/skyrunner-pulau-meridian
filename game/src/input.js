// input.js — keyboard + mouse for the Kestrel.
// W/S throttle, A/D roll, arrows pitch, Q/E yaw, Space brake, Shift boost,
// R restart, C camera, M mute. Mouse drag orbits the chase camera a little.

function makeInput() {
  const input = {
    throttleUp: false, throttleDown: false,
    rollLeft: false, rollRight: false,
    pitchUp: false, pitchDown: false,
    yawLeft: false, yawRight: false,
    brake: false, boost: false,
    restart: false, camera: false, mute: false,
    mouseDX: 0, mouseDY: 0,
  };
  const keys = {};
  function applyKey(code, down) {
    keys[code] = down;
    input.throttleUp = !!keys['KeyW'];
    input.throttleDown = !!keys['KeyS'];
    input.rollLeft = !!keys['KeyA'];
    input.rollRight = !!keys['KeyD'];
    input.pitchUp = !!keys['ArrowUp'];
    input.pitchDown = !!keys['ArrowDown'];
    input.yawLeft = !!keys['KeyQ'];
    input.yawRight = !!keys['KeyE'];
    input.brake = !!keys['Space'];
    input.boost = !!keys['ShiftLeft'] || !!keys['ShiftRight'];
  }
  window.addEventListener('keydown', function (e) {
    if (['ArrowUp', 'ArrowDown', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) return;
    applyKey(e.code, true);
    if (e.code === 'KeyR') input.restart = true;
    if (e.code === 'KeyC') input.camera = true;
    if (e.code === 'KeyM') input.mute = true;
  });
  window.addEventListener('keyup', function (e) { applyKey(e.code, false); });
  let dragging = false, lastX = 0, lastY = 0;
  window.addEventListener('mousedown', function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', function () { dragging = false; });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    input.mouseDX += e.clientX - lastX;
    input.mouseDY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  });
  input.consumeEdges = function consumeEdges() {
    const edges = { restart: input.restart, camera: input.camera, mute: input.mute };
    input.restart = false; input.camera = false; input.mute = false;
    return edges;
  };
  input.consumeMouse = function consumeMouse() {
    const m = { dx: input.mouseDX, dy: input.mouseDY };
    input.mouseDX = 0; input.mouseDY = 0;
    return m;
  };
  return input;
}
