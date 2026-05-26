'use client';

// Dynamic skeuomorphic audio synthesizer using Web Audio API
// Synthesizes tactile mechanical keyboard clicks, metallic pings, alert hums, and timers.
class AudioFeedbackEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vidyaverse-tactile-audio');
      this.enabled = saved !== 'false';
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('vidyaverse-tactile-audio', val ? 'true' : 'false');
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Heavy mechanical switch click (Tactile MX Brown feel)
  public playClick() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Noise buffer for the mechanical scratchiness
    const bufferSize = this.ctx.sampleRate * 0.015; // 15ms click
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.Q.setValueAtTime(3, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    // Primary metallic contact sound
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.01);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    // High frequency transient pop
    const pop = this.ctx.createOscillator();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(3500, now);
    pop.frequency.exponentialRampToValueAtTime(1000, now + 0.003);

    const popGain = this.ctx.createGain();
    popGain.gain.setValueAtTime(0.05, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.004);

    // Connect nodes
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    pop.connect(popGain);
    popGain.connect(this.ctx.destination);

    // Execute
    noise.start(now);
    osc.start(now);
    pop.start(now);
    
    noise.stop(now + 0.02);
    osc.stop(now + 0.02);
    pop.stop(now + 0.02);
  }

  // Metallic harmonic notification chime (achievement unlocked or XP gained)
  public playSuccessPing() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Harmonically overlapping frequencies
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord
    
    freqs.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.03);

      const gain = this.ctx!.createGain();
      // Decay slower for higher resonance
      const duration = 0.5 - index * 0.08;
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + index * 0.03 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.03 + duration);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + index * 0.03);
      osc.stop(now + index * 0.03 + duration + 0.05);
    });
  }

  // Double pulse tactical alert
  public playAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    const playTone = (time: number, freq: number) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(time);
      osc.stop(time + 0.2);
    };

    playTone(now, 880);
    playTone(now + 0.12, 1100);
  }

  // Retro strict-mode buzzer alarm
  public playBuzzer() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(115, now + 0.3);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(111, now);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }
}

export const audioEngine = new AudioFeedbackEngine();
