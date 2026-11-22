// Ember Pact — tiny WebAudio bleeps, no audio files. Starts on first input.

let ctx = null;

export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, ms, type = 'sine', gain = 0.08, when = 0) {
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + ms / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

export const sfx = {
  select() { tone(520, 70, 'triangle', 0.05); },
  summon() { tone(220, 120, 'sawtooth', 0.05); tone(330, 140, 'triangle', 0.06, 0.05); },
  hit() { tone(160, 120, 'square', 0.07); tone(90, 160, 'sawtooth', 0.06, 0.03); },
  turn() { tone(440, 80, 'triangle', 0.05); tone(587, 100, 'triangle', 0.05, 0.07); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 220, 'triangle', 0.07, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 260, 'sawtooth', 0.05, i * 0.14)); },
};
