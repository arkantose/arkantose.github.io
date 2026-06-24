// Fetch sound effects. All procedurally synthesized via Web Audio, so there are
// no audio files to ship. Gentle volumes. Honors a mute toggle.
const SFX = (() => {
  let ctx = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, to = null, dur = 0.12, type = 'sine', gain = 0.12, delay = 0 }) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.2, gain = 0.15, filter = 900, sweepTo = null, type = 'lowpass', delay = 0 }) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + delay;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filter, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0); src.stop(t0 + dur);
  }

  const sounds = {
    click() { tone({ freq: 520, to: 680, dur: 0.06, type: 'triangle', gain: 0.06 }); },
    nav() { tone({ freq: 380, to: 560, dur: 0.08, type: 'sine', gain: 0.07 }); },
    success() { [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.16, gain: 0.1, delay: i * 0.09 })); },
    fetch() { noise({ dur: 0.35, gain: 0.08, filter: 300, sweepTo: 1800 }); tone({ freq: 300, to: 760, dur: 0.32, gain: 0.05 }); },
    dig() { for (let i = 0; i < 3; i++) noise({ dur: 0.12, gain: 0.12, filter: 420, delay: i * 0.14 }); },
    gift() { [784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.18, gain: 0.09, delay: i * 0.05 })); },
    bark() { tone({ freq: 520, to: 240, dur: 0.09, type: 'square', gain: 0.08 }); tone({ freq: 480, to: 220, dur: 0.09, type: 'square', gain: 0.08, delay: 0.14 }); },
  };

  return {
    play(name) { if (!enabled) return; const f = sounds[name]; if (f) { try { f(); } catch (e) {} } },
    setEnabled(v) { enabled = !!v; if (enabled) ensure(); },
    isEnabled() { return enabled; },
    ensure,
  };
})();
window.SFX = SFX;
