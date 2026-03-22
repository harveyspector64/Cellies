// YARD — Procedural Sound System (Web Audio API)

const SFX = {
  ctx: null,
  masterGain: null,
  initialized: false,
  muted: false,

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // --- IMPACT SOUNDS ---

  // Fleshy punch thud — clean hit
  punchHit(intensity = 1) {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Low thud (body impact)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80 + intensity * 30, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain.gain.setValueAtTime(0.35 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Noise burst (slap/crack)
    const bufLen = ctx.sampleRate * 0.06;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800 + intensity * 600;
    filter.Q.value = 1.5;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.06);
  },

  // Heavy hook impact — meatier
  hookHit(intensity = 1) {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Deep body thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.2);
    gain.gain.setValueAtTime(0.45 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);

    // Harder crack
    const bufLen = ctx.sampleRate * 0.08;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.5);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 1;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.08);

    // Sub thump for weight
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = 35;
    subGain.gain.setValueAtTime(0.3 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.15);
  },

  // Block/guard impact — dull thump
  blockHit() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);

    // Muffled noise
    const bufLen = ctx.sampleRate * 0.04;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 4);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.04);
  },

  // Whiff — air swoosh
  whiff() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufLen = ctx.sampleRate * 0.12;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.linearRampToValueAtTime(800, now + 0.12);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.12);
  },

  // Body hitting concrete — knockdown
  knockdown() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Heavy thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Concrete scrape
    const bufLen = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.8;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now + 0.03);
    noise.stop(now + 0.18);
  },

  // KO hit — devastating final blow
  koHit() {
    if (!this.initialized || this.muted) return;
    this.hookHit(1.5);
    // Extra reverb-like tail
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(15, now + 0.5);
    gain.gain.setValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now + 0.05);
    osc.stop(now + 0.5);
  },

  // Shove impact
  shove() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Cloth/push sound
    const bufLen = ctx.sampleRate * 0.1;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      data[i] = (Math.random() * 2 - 1) * (1 - t * t);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.7;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.1);

    // Thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  },

  // --- AMBIENT ---

  // Yard ambiance — continuous low drone + distant murmur
  _ambienceNode: null,
  _ambienceGain: null,

  startAmbience(mode) {
    if (!this.initialized || this.muted) return;
    this.stopAmbience();
    const ctx = this.ctx;

    this._ambienceGain = ctx.createGain();
    this._ambienceGain.gain.value = mode === 'riot' ? 0.06 : 0.03;
    this._ambienceGain.connect(this.masterGain);

    // Looping noise buffer for crowd murmur
    const secs = 2;
    const bufLen = ctx.sampleRate * secs;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Brown noise (integrated white noise) — sounds like distant crowd
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + (0.02 * white)) / 1.02;
      data[i] = last * 3.5;
    }
    this._ambienceNode = ctx.createBufferSource();
    this._ambienceNode.buffer = buf;
    this._ambienceNode.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = mode === 'riot' ? 350 : 200;
    filter.Q.value = 0.5;

    this._ambienceNode.connect(filter);
    filter.connect(this._ambienceGain);
    this._ambienceNode.start();
  },

  stopAmbience() {
    if (this._ambienceNode) {
      try { this._ambienceNode.stop(); } catch(e) {}
      this._ambienceNode = null;
    }
    if (this._ambienceGain) {
      this._ambienceGain.disconnect();
      this._ambienceGain = null;
    }
  },

  // Crowd roar — burst on KO or big moment
  crowdRoar(intensity = 1) {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const secs = 0.8;
    const bufLen = ctx.sampleRate * secs;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      const white = Math.random() * 2 - 1;
      last = (last + (0.02 * white)) / 1.02;
      // Swell up then fade
      const envelope = Math.sin(t * Math.PI) * (1 - t * 0.3);
      data[i] = last * 3.5 * envelope;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12 * intensity, now);
    gain.gain.linearRampToValueAtTime(0.001, now + secs);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.4;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + secs);
  },

  // Guard whistle — sharp high pitch
  whistle() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.25;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2800, t);
      osc.frequency.linearRampToValueAtTime(2400, t + 0.15);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  },

  // Bell/gong — fight start
  bell() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Metallic ring
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 800;
    osc2.type = 'sine';
    osc2.frequency.value = 1200;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  },

  // Slip/dodge swoosh — quick air
  slip() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufLen = ctx.sampleRate * 0.08;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.08);
  }
};
