// Fetch companion dog. Paces along the bottom (kept clear of the rail and its
// buttons), reacts to pipeline events, and every so often digs a dirt pile and
// unearths a gift tuned to Riley's interests.
const Dog = (() => {
  const el = () => document.getElementById('dog');
  const speech = () => document.getElementById('dogSpeech');
  const MIN_X = 236; // stay right of the 220px rail so he never covers its buttons
  let x = 240, dir = 1, speed = 0.85, paused = false, hideTimer = null;

  const encouragements = [
    "You've got this, Riley!",
    "Strong work. Literally.",
    "Hydrate and keep crushing it. 💧",
    "Good human. Have a treat. 🦴",
    "Another module down. Gains.",
    "I fetched those for you!",
    "Macros on point, callouts on point.",
    "Take a stretch break, champ.",
    "Big brain energy today. 🧠",
    "Proud of you. Keep going!",
  ];

  // Gifts tuned to Riley: workout, nutrition, and a little nerdy treasure.
  const gifts = [
    { e: '🦴', m: 'Dug up a bone! Yours.' },
    { e: '💪', m: 'Found a dumbbell. Gains incoming.' },
    { e: '🍎', m: 'An apple. Stay fueled.' },
    { e: '🥤', m: 'Protein shake, fresh from the dirt.' },
    { e: '🥦', m: 'Broccoli! Eat your greens.' },
    { e: '🏅', m: 'A medal. You earned it.' },
    { e: '🎮', m: 'A controller. Break later?' },
    { e: '💾', m: 'A floppy disk. Nerd treasure.' },
    { e: '🥗', m: 'Salad! Macros on point.' },
    { e: '🧠', m: 'Big brain energy today.' },
  ];

  function setMood(mood) { const d = el(); if (!d) return; d.classList.remove('idle', 'happy', 'sleep', 'dig'); d.classList.add(mood); }
  function face() { const d = el(); const svg = d && d.querySelector('svg'); if (svg) svg.style.transform = 'scaleX(' + dir + ')'; }

  function say(msg, ms = 3200) {
    const s = speech(); if (!s) return;
    s.textContent = msg; s.classList.add('show');
    clearTimeout(hideTimer); hideTimer = setTimeout(() => s.classList.remove('show'), ms);
  }

  function happy(msg) {
    setMood('happy'); if (msg) say(msg);
    if (window.SFX) SFX.play('bark');
    setTimeout(() => { setMood('idle'); paused = false; }, 1400);
  }
  function sleep(msg) { paused = true; setMood('sleep'); if (msg) say(msg, 2600); }
  function wake() { paused = false; setMood('idle'); }

  function step() {
    const d = el();
    if (d && !paused) {
      x += dir * speed;
      const max = window.innerWidth - 150;
      if (x >= max) { x = max; dir = -1; face(); }
      if (x <= MIN_X) { x = MIN_X; dir = 1; face(); }
      d.style.left = x + 'px';
    }
    requestAnimationFrame(step);
  }

  function burstSpecks(gx) {
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('div');
      s.className = 'speck';
      s.style.left = (gx + 18 + (Math.random() * 20 - 10)) + 'px';
      s.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      s.style.setProperty('--dy', (-(30 + Math.random() * 30)) + 'px');
      document.body.appendChild(s);
      setTimeout(() => s.classList.add('fly'), 20);
      setTimeout(() => s.remove(), 700);
    }
  }

  function spawnGift(gx) {
    const g = gifts[Math.floor(Math.random() * gifts.length)];
    const node = document.createElement('div');
    node.className = 'gift';
    node.textContent = g.e;
    node.style.left = (gx + 14) + 'px';
    document.body.appendChild(node);
    setTimeout(() => node.classList.add('pop'), 20);
    if (window.SFX) SFX.play('gift'); // sound fires exactly when the present appears
    say(g.m, 3600);
    node.onclick = () => { if (window.SFX) SFX.play('gift'); say('Aw, thanks! 🐾'); };
    setTimeout(() => node.classList.add('bye'), 3200);
    setTimeout(() => node.remove(), 4000);
  }

  function dig() {
    if (paused || document.hidden) return; // never dig (or play sounds) when the window is hidden/minimized
    paused = true; setMood('dig');
    const d = el(); const rect = d.getBoundingClientRect();
    const gx = Math.round(rect.left + 30);
    // 1. a pile of dirt appears at his paws
    const mound = document.createElement('div');
    mound.className = 'dirt';
    mound.style.left = gx + 'px';
    document.body.appendChild(mound);
    setTimeout(() => mound.classList.add('show'), 20);
    if (window.SFX) SFX.play('dig');
    // 2. he digs (specks fly)
    burstSpecks(gx);
    setTimeout(() => burstSpecks(gx), 380);
    // 3. the gift pops out of the pile
    setTimeout(() => spawnGift(gx), 850);
    // 4. the pile settles and clears
    setTimeout(() => mound.classList.add('gone'), 1700);
    setTimeout(() => { mound.remove(); setMood('idle'); paused = false; }, 2200);
  }

  function scheduleDig() {
    const wait = 12000 + Math.random() * 14000;
    setTimeout(() => { dig(); scheduleDig(); }, wait);
  }

  function init() {
    const d = el(); if (!d) return;
    setMood('idle'); face();
    d.addEventListener('click', () => happy(encouragements[Math.floor(Math.random() * encouragements.length)]));
    requestAnimationFrame(step);
    scheduleDig();
    setInterval(() => { if (!paused && Math.random() < 0.45) say(encouragements[Math.floor(Math.random() * encouragements.length)]); }, 42000);
    setTimeout(() => say("Hey Riley! Plug in the headset and I'll fetch your videos."), 800);
  }

  return { init, say, happy, sleep, wake, setMood };
})();
window.Dog = Dog;
