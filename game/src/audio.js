// audio.js — synthesised sound, no audio files: engine hum, ring chime,
// landing fanfare and crash thud, all from one WebAudio graph.

function makeSoundFX() {
  const fx = { ctx: null, engineOsc: null, engineGain: null, enabled: false };
  fx.unlock = function unlock() {
    if (fx.ctx) { if (fx.ctx.state === 'suspended') fx.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      fx.ctx = new AC();
      fx.engineOsc = fx.ctx.createOscillator();
      fx.engineOsc.type = 'sawtooth';
      fx.engineOsc.frequency.value = 55;
      const filter = fx.ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 420;
      fx.engineGain = fx.ctx.createGain();
      fx.engineGain.gain.value = 0.0;
      fx.engineOsc.connect(filter); filter.connect(fx.engineGain); fx.engineGain.connect(fx.ctx.destination);
      fx.engineOsc.start();
      fx.enabled = true;
    } catch (e) { fx.enabled = false; }
  };
  fx.engine = function engine(throttle, speed) {
    if (!fx.enabled || !fx.engineOsc) return;
    fx.engineOsc.frequency.value = 42 + throttle * 70 + speed * 0.12;
    fx.engineGain.gain.value = 0.015 + throttle * 0.03;
  };
  fx.beep = function beep(freq, dur, type, vol) {
    if (!fx.enabled) return;
    try {
      const o = fx.ctx.createOscillator(), g = fx.ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, fx.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, fx.ctx.currentTime + dur);
      o.connect(g); g.connect(fx.ctx.destination);
      o.start(); o.stop(fx.ctx.currentTime + dur);
    } catch (e) { /* silent when audio is unavailable */ }
  };
  fx.ring = function ring() { fx.beep(880, 0.18, 'sine', 0.16); setTimeout(function () { fx.beep(1318, 0.3, 'sine', 0.14); }, 90); };
  fx.landing = function landing() { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { fx.beep(f, 0.35, 'triangle', 0.15); }, i * 110); }); };
  fx.crash = function crash() { fx.beep(70, 0.6, 'sawtooth', 0.22); fx.beep(48, 0.8, 'square', 0.12); };
  fx.warning = function warning() { fx.beep(440, 0.12, 'square', 0.07); };
  return fx;
}
