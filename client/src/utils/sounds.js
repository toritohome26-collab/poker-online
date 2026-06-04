let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function beep(freq, dur, type = 'sine', vol = 0.3, delay = 0) {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + dur);
  } catch {}
}

export const sounds = {
  card() {
    beep(1200, 0.06, 'triangle', 0.15);
    beep(800,  0.04, 'triangle', 0.1, 0.05);
  },
  chip() {
    beep(900, 0.08, 'sine', 0.2);
    beep(1100, 0.05, 'sine', 0.15, 0.04);
  },
  fold() {
    beep(400, 0.12, 'sine', 0.15);
    beep(300, 0.1,  'sine', 0.1, 0.08);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'sine', 0.25, i * 0.1));
  },
  lose() {
    beep(350, 0.2, 'sawtooth', 0.15);
    beep(280, 0.3, 'sawtooth', 0.1, 0.15);
  },
  allin() {
    beep(600, 0.1, 'square', 0.2);
    beep(800, 0.1, 'square', 0.2, 0.1);
    beep(1000, 0.15, 'square', 0.2, 0.2);
  },
  newHand() {
    beep(440, 0.08, 'sine', 0.1);
    beep(550, 0.08, 'sine', 0.1, 0.1);
  }
};
