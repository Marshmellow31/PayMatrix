/**
 * PayMatrix v3 Web Audio Engine
 * Provides zero-latency auditory feedback using the HTML5 Web Audio API
 * Synthesizes pure tones or plays audio buffers with sub-15ms latency
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = typeof localStorage !== 'undefined' 
      ? localStorage.getItem('paymatrix_sfx_muted') === 'true' 
      : false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('paymatrix_sfx_muted', String(muted));
    }
  }

  play(soundType = 'pop') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      switch (soundType) {
        case 'pop':
          this.synthesizePop();
          break;
        case 'coin':
          this.synthesizeCoin();
          break;
        case 'fanfare':
          this.synthesizeFanfare();
          break;
        case 'whoosh':
          this.synthesizeWhoosh();
          break;
        case 'delete':
          this.synthesizeDelete();
          break;
        default:
          this.synthesizePop();
      }
    } catch (err) {
      console.warn('SoundEngine playback failed:', err);
    }
  }

  // Synthesizes a clean bubble/wood pop (540Hz -> 780Hz)
  synthesizePop() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Synthesizes a metallic coin ring (1480Hz & 2960Hz dual tone)
  synthesizeCoin() {
    const now = this.ctx.currentTime;
    [1480, 2960].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    });
  }

  // Synthesizes a celebratory arpeggio fanfare (C5, E5, G5, C6)
  synthesizeFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  // Synthesizes a swift whoosh transition (low-pass noise sweep)
  synthesizeWhoosh() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Synthesizes a gentle deletion thud (220Hz -> 90Hz)
  synthesizeDelete() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
