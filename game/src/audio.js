// Moonlit Vault — synthesized sound. One job: every beep, tread and sting,
// made with WebAudio oscillators and filtered noise, no audio files at all.
//
// Guard footsteps carry distance: the nearer the guard, the louder the tread,
// so a player can hear a patrol coming around a crate before seeing it.
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.ambientTimer = 0;
  }

  // Browsers want a user gesture before audio starts; call on first input.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, dur, type, vol, when = 0) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A short burst of low-passed noise: a footstep on wooden floor.
  thud(vol, low = 320) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.07);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  // The player's own step: quiet, close, wooden.
  playerStep(stance) {
    this.thud(stance === 'run' ? 0.22 : stance === 'sneak' ? 0.05 : 0.12, 300);
  }

  // A guard's step, loudness by distance to the player.
  guardStep(dist) {
    const vol = Math.max(0, 0.3 * (1 - dist / 520));
    if (vol > 0.015) this.thud(vol, 200);
  }

  // A coin landing: a bright ping that pulls guards over.
  coinPing() {
    this.tone(1568, 0.35, 'sine', 0.22);
    this.tone(2093, 0.3, 'sine', 0.12, 0.07);
  }

  // A relic pocketed: a small two-note chime.
  pickup() {
    this.tone(880, 0.16, 'triangle', 0.2);
    this.tone(1318, 0.24, 'triangle', 0.18, 0.09);
  }

  // The meter just filled: a rising alarm sting.
  alarm() {
    this.tone(220, 0.5, 'sawtooth', 0.16);
    this.tone(330, 0.5, 'sawtooth', 0.16, 0.12);
    this.tone(440, 0.7, 'sawtooth', 0.16, 0.24);
  }

  // Caught: a low thud and a falling tone.
  caught() {
    this.thud(0.5, 160);
    this.tone(180, 0.7, 'sawtooth', 0.2, 0.05);
    this.tone(90, 0.9, 'sawtooth', 0.2, 0.15);
  }

  // A floor cleared: a warm little arpeggio.
  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.18, i * 0.09));
  }

  // The whole vault, done: a longer arpeggio.
  victory() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.18, i * 0.11));
  }

  // A soft room tone every few seconds, so the night is never quite silent.
  ambient(dt) {
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 4 + Math.random() * 3;
      this.tone(55, 2.2, 'sine', 0.035);
    }
  }
}
