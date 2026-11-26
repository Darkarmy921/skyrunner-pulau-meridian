// hud.js — the instruments: big readable HUD numbers, mission banner,
// fuel and damage bars, throttle, compass strip, and the cockpit panel
// with three lit round gauges (airspeed, altimeter, attitude).

function padNum(v, width) {
  const s = String(Math.max(0, Math.round(v)));
  return s.length >= width ? s : ('0000' + s).slice(-width);
}

function headingText(deg) {
  const d = ((Math.round(deg) % 360) + 360) % 360;
  return ('00' + d).slice(-3);
}

function compassPoints(deg) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function updateHUD(state, mission, timer, msg) {
  const altM = Math.max(0, state.pos.y);
  const spdKt = state.speed * MS_TO_KT;
  const hdgDeg = ((-state.heading * 180 / Math.PI) % 360 + 360) % 360;
  document.getElementById('hud-alt').textContent = padNum(altM, 4);
  document.getElementById('hud-spd').textContent = padNum(spdKt, 3);
  document.getElementById('hud-hdg').textContent = headingText(hdgDeg) + ' ' + compassPoints(hdgDeg);
  document.getElementById('hud-score').textContent = String(state.score);
  document.getElementById('hud-mission').textContent = mission.title;
  document.getElementById('hud-brief').textContent = mission.brief;
  document.getElementById('hud-rings').textContent = state.ringsPassed + ' / 8 RINGS';
  const fuelEl = document.getElementById('hud-fuel-fill');
  fuelEl.style.width = Math.max(0, state.fuel) + '%';
  fuelEl.style.background = state.fuel < 25 ? '#ff4444' : '#37d67a';
  const dmgEl = document.getElementById('hud-dmg-fill');
  dmgEl.style.width = Math.max(0, state.damage) + '%';
  const thrEl = document.getElementById('hud-thr-fill');
  thrEl.style.width = Math.round(state.throttle * 100) + '%';
  document.getElementById('hud-thr-num').textContent = Math.round(state.throttle * 100) + '%';
  const timerEl = document.getElementById('hud-timer');
  if (timer !== null && timer !== undefined) {
    timerEl.style.display = 'block';
    timerEl.textContent = 'DELIVERY ' + Math.max(0, Math.ceil(timer)) + 's';
    timerEl.style.color = timer < 20 ? '#ff5555' : '#ffd23e';
  } else {
    timerEl.style.display = 'none';
  }
  const warn = document.getElementById('hud-warn');
  if (state.crashed) { warn.textContent = 'CRASHED — press R to fly again'; warn.style.display = 'block'; }
  else if (state.stallWarning) { warn.textContent = 'STALL — ADD THROTTLE'; warn.style.display = 'block'; }
  else if (state.engineOut) { warn.textContent = 'FUEL EMPTY — GLIDING, LAND TO REFUEL'; warn.style.display = 'block'; }
  else if (msg) { warn.textContent = msg; warn.style.display = 'block'; }
  else { warn.style.display = 'none'; }
  // Attitude mini-gauge: horizon line tilts with roll, ladder shifts with pitch.
  const att = document.getElementById('hud-attitude');
  if (att) drawAttitude(att.getContext('2d'), state);
}

function drawAttitude(ctx, state) {
  const w = 150, h = 150;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath(); ctx.arc(75, 75, 70, 0, Math.PI * 2); ctx.clip();
  ctx.translate(75, 75);
  ctx.rotate(-state.roll);
  ctx.translate(0, state.pitch * 90);
  ctx.fillStyle = '#3f8fd2'; ctx.fillRect(-90, -160, 180, 160); // sky
  ctx.fillStyle = '#7a5a34'; ctx.fillRect(-90, 0, 180, 160);    // ground
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-90, -2, 180, 4);     // horizon
  ctx.restore();
  // Fixed wings + centre dot: the aircraft symbol never moves.
  ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(35, 75); ctx.lineTo(65, 75); ctx.moveTo(85, 75); ctx.lineTo(115, 75); ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath(); ctx.arc(75, 75, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(75, 75, 70, 0, Math.PI * 2); ctx.stroke();
}

// Cockpit panel: three round gauges drawn lit on one canvas.
function drawCockpitPanel(state) {
  const cv = document.getElementById('cockpit-panel');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  // Panel backing.
  ctx.fillStyle = '#14181f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#3a4354'; ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  const spdKt = state.speed * MS_TO_KT;
  const altM = Math.max(0, state.pos.y);
  const hdgDeg = ((-state.heading * 180 / Math.PI) % 360 + 360) % 360;
  drawGauge(ctx, W * 0.20, H * 0.50, 58, 'AIRSPEED', 'KT', spdKt, 0, 220, '#ffd23e');
  drawGauge(ctx, W * 0.50, H * 0.50, 58, 'ALTITUDE', 'M', altM, 0, 400, '#4fc3ff');
  drawGauge(ctx, W * 0.80, H * 0.50, 58, 'HEADING', 'DEG', hdgDeg, 0, 360, '#7dff8a');
  // Centre readout strip.
  ctx.fillStyle = '#e8f2ff';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ALT ' + padNum(altM, 4) + ' m   SPD ' + padNum(spdKt, 3) + ' kt   HDG ' + headingText(hdgDeg), W / 2, 34);
}

function drawGauge(ctx, cx, cy, r, label, unit, value, min, max, accent) {
  ctx.save();
  ctx.translate(cx, cy);
  // Face.
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1117'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#8b98ad'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,210,62,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  // Ticks.
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    const x1 = Math.cos(a) * (r - 10), y1 = Math.sin(a) * (r - 10);
    const x2 = Math.cos(a) * (r - 20), y2 = Math.sin(a) * (r - 20);
    ctx.strokeStyle = '#cdd7e4'; ctx.lineWidth = i % 5 === 0 ? 3 : 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // Needle.
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const na = Math.PI * 0.75 + frac * Math.PI * 1.5;
  ctx.strokeStyle = accent; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(na) * (r - 14), Math.sin(na) * (r - 14)); ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  // Digital value + label.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(value)), 0, r * 0.45);
  ctx.fillStyle = '#9fb2c8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(label + ' ' + unit, 0, r + 20);
  ctx.restore();
}
