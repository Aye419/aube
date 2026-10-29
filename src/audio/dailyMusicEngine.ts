import { DailyScore, InstrumentTimbre } from '../types/alarm';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class DailyMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private schedulerTimer: number | null = null;
  private activeScore: DailyScore | null = null;
  private isPlayingState = false;
  private nextNoteTime = 0;
  private currentStep = 0;
  private customAudioEl: HTMLAudioElement | null = null;
  private customMediaSource: MediaElementAudioSourceNode | null = null;
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getActiveScoreId(): string | null {
    return this.activeScore?.id ?? null;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioState(): AudioContextState {
    return this.ctx?.state ?? 'suspended';
  }

  public async unlock(): Promise<void> {
    this.ensureGraph();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        this.notify();
      } catch {
        // Ignore if not triggered by user gesture yet
      }
    }
  }

  private ensureGraph(): void {
    if (this.ctx) return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    // Master dynamics compressor to prevent clipping and impart warm glue
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.015;
    compressor.release.value = 0.25;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.84;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.75;

    const dryBus = ctx.createGain();
    dryBus.gain.value = 0.78;

    // Algorithmic stereo lush hall impulse response
    const convolver = ctx.createConvolver();
    convolver.buffer = this.createHallImpulse(ctx, 3.2, 2.6);

    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.42;

    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.65;

    // Warm stereo ping-pong tape delay
    const delaySend = ctx.createGain();
    delaySend.gain.value = 0.24;

    const delayL = ctx.createDelay(2.0);
    const delayR = ctx.createDelay(2.0);
    delayL.delayTime.value = 0.375;
    delayR.delayTime.value = 0.5;

    const delayTone = ctx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 2100;

    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;

    const merger = ctx.createChannelMerger(2);

    delaySend.connect(delayTone);
    delayTone.connect(delayL);
    delayL.connect(delayR);
    delayR.connect(feedback);
    feedback.connect(delayTone);

    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);

    dryBus.connect(masterGain);
    reverbSend.connect(convolver);
    convolver.connect(reverbReturn);
    reverbReturn.connect(masterGain);
    merger.connect(masterGain);

    masterGain.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(ctx.destination);

    this.masterGain = masterGain;
    this.dryBus = dryBus;
    this.reverbSend = reverbSend;
    this.delaySend = delaySend;
    this.analyser = analyser;
  }

  private createHallImpulse(ctx: AudioContext, durationSec: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const envelope = Math.pow(1 - t, decay) * (1 - Math.exp(-i / (sampleRate * 0.02)));
        const white = Math.random() * 2 - 1;
        // One-pole lowpass damping for warm wooden concert room acoustics
        prev = prev * 0.72 + white * 0.28;
        channelData[i] = prev * envelope * 0.65;
      }
    }
    return impulse;
  }

  public async playScore(
    score: DailyScore,
    options?: { targetVolume?: number; fadeInSeconds?: number }
  ): Promise<void> {
    this.stop();
    this.ensureGraph();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Browser may require gesture
      }
    }

    const now = this.ctx.currentTime;
    const targetVol = Math.max(0.05, Math.min(1.0, options?.targetVolume ?? 0.8));
    const fadeSec = options?.fadeInSeconds ?? 1.2;

    this.masterGain.gain.cancelScheduledValues(now);
    if (fadeSec > 2) {
      // Gentle sunrise volume fade-in
      this.masterGain.gain.setValueAtTime(0.03, now);
      this.masterGain.gain.linearRampToValueAtTime(targetVol, now + fadeSec);
    } else {
      this.masterGain.gain.setValueAtTime(0.01, now);
      this.masterGain.gain.linearRampToValueAtTime(targetVol, now + fadeSec);
    }

    this.activeScore = score;
    this.isPlayingState = true;
    this.currentStep = 0;
    this.nextNoteTime = now + 0.06;

    this.scheduleLoop();
    this.notify();
  }

  public async playCustomAudio(
    dataUrl: string,
    options?: { targetVolume?: number; fadeInSeconds?: number }
  ): Promise<void> {
    this.stop();
    this.ensureGraph();
    if (!this.ctx || !this.masterGain || !this.dryBus) return;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Browser gesture check
      }
    }

    const now = this.ctx.currentTime;
    const targetVol = Math.max(0.05, Math.min(1.0, options?.targetVolume ?? 0.8));
    const fadeSec = options?.fadeInSeconds ?? 1.5;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0.03, now);
    this.masterGain.gain.linearRampToValueAtTime(targetVol, now + fadeSec);

    const audio = new Audio(dataUrl);
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    this.customAudioEl = audio;

    try {
      const source = this.ctx.createMediaElementSource(audio);
      source.connect(this.dryBus);
      if (this.reverbSend) {
        source.connect(this.reverbSend);
      }
      this.customMediaSource = source;
      await audio.play();
      this.isPlayingState = true;
      this.notify();
    } catch {
      this.stop();
    }
  }

  public setVolume(volume: number): void {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0.05, Math.min(1.0, volume));
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(clamped, now, 0.08);
  }

  public stop(): void {
    if (this.schedulerTimer !== null) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customAudioEl.src = '';
      this.customAudioEl = null;
    }

    if (this.customMediaSource) {
      try {
        this.customMediaSource.disconnect();
      } catch {
        // Ignore disconnect error
      }
      this.customMediaSource = null;
    }

    if (this.ctx && this.masterGain && this.isPlayingState) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.08);
    }

    this.activeScore = null;
    this.isPlayingState = false;
    this.notify();
  }

  private scheduleLoop = (): void => {
    if (!this.isPlayingState || !this.ctx || !this.activeScore) return;

    const lookaheadSec = 0.18;
    const score = this.activeScore;
    // Each 8th-note step duration
    const stepDuration = 60 / score.bpm / 2;

    while (this.nextNoteTime < this.ctx.currentTime + lookaheadSec) {
      this.triggerMusicalStep(score, this.currentStep, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 32; // 4 bars of 8 eighth-notes
    }

    this.schedulerTimer = window.setTimeout(this.scheduleLoop, 60);
  };

  private triggerMusicalStep(
    score: DailyScore,
    step: number,
    time: number,
    stepDur: number
  ): void {
    const barIndex = Math.floor(step / 8) % score.chords.length;
    const stepInBar = step % 8;
    const chord = score.chords[barIndex];

    // 1. Downbeat of each bar: Play lush harmonic pad/bass + rolled chord voicing
    if (stepInBar === 0) {
      // Deep warm bass root swell
      this.playWarmBassOrPad(chord[0], time, stepDur * 7.8, score.timbre);

      if (score.timbre === InstrumentTimbre.BowedGlass) {
        // Slow ethereal overlapping chord bloom
        chord.slice(1).forEach((note, idx) => {
          this.playVoiceNote(
            note,
            time + idx * 0.12,
            stepDur * 7.5,
            0.13,
            score.timbre,
            (idx - 2) * 0.25
          );
        });
      } else {
        // Gentle human-like strummed / rolled chord across 45ms per note
        chord.slice(1, 5).forEach((note, idx) => {
          const humanJitter = idx * 0.055 + Math.random() * 0.012;
          this.playVoiceNote(
            note,
            time + humanJitter,
            stepDur * 5.2,
            0.16 - idx * 0.015,
            score.timbre,
            (idx - 1.5) * 0.22
          );
        });
      }
    }

    // 2. Arpeggio & Melodic Motif Patterns tailored per day's composition
    if (score.timbre === InstrumentTimbre.ConcertHarp || score.timbre === InstrumentTimbre.NylonGuitar) {
      // Flowing acoustic arpeggio on every eighth note
      const arpNote = chord[(stepInBar + 1) % chord.length];
      const octaveShift = stepInBar >= 5 ? 12 : 0;
      const pan = Math.sin(step * 0.5) * 0.45;
      this.playVoiceNote(
        arpNote + octaveShift,
        time,
        stepDur * 2.6,
        stepInBar % 2 === 0 ? 0.17 : 0.12,
        score.timbre,
        pan
      );
    } else if (score.timbre === InstrumentTimbre.RosewoodMarimba) {
      // Joyful syncopated marimba ostinato
      if (stepInBar === 0 || stepInBar === 2 || stepInBar === 3 || stepInBar === 5 || stepInBar === 6) {
        const note = score.motifNotes[(step + barIndex * 2) % score.motifNotes.length];
        this.playVoiceNote(
          note,
          time,
          stepDur * 1.9,
          stepInBar === 0 || stepInBar === 3 ? 0.2 : 0.14,
          score.timbre,
          ((step % 5) - 2) * 0.2
        );
      }
    } else {
      // Lyrical upper-register motif notes on expressive beats
      if (stepInBar === 2 || stepInBar === 4 || stepInBar === 6 || (stepInBar === 7 && barIndex % 2 === 1)) {
        const motifIdx = (Math.floor(step / 2) + barIndex) % score.motifNotes.length;
        const note = score.motifNotes[motifIdx];
        this.playVoiceNote(
          note,
          time + 0.01,
          stepDur * 3.1,
          0.14,
          score.timbre,
          Math.cos(step * 0.7) * 0.35
        );
      }
    }

    // 3. Delicate dawn nature shimmer / morning birdsong harmonic tucked softly in hall reverb
    if (score.natureShimmer > 0 && stepInBar === 5 && Math.random() < score.natureShimmer) {
      this.playMorningShimmer(score.motifNotes[0] + 12, time + stepDur * 0.3);
    }
  }

  private playWarmBassOrPad(
    midiNote: number,
    time: number,
    duration: number,
    timbre: InstrumentTimbre
  ): void {
    if (!this.ctx || !this.dryBus || !this.reverbSend) return;
    const ctx = this.ctx;
    const freq = midiToFreq(midiNote);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = timbre === InstrumentTimbre.FeltPiano ? 'sawtooth' : 'triangle';

    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.002, time); // Gentle warm detune

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(timbre === InstrumentTimbre.FeltPiano ? 340 : 280, time);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(0.18, time + 0.45);
    env.gain.exponentialRampToValueAtTime(0.0008, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.dryBus);
    env.connect(this.reverbSend);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  private playVoiceNote(
    midiNote: number,
    time: number,
    duration: number,
    velocity: number,
    timbre: InstrumentTimbre,
    panValue: number
  ): void {
    if (!this.ctx || !this.dryBus || !this.reverbSend || !this.delaySend) return;
    const ctx = this.ctx;
    const freq = midiToFreq(midiNote);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, panValue)), time);

    const outGain = ctx.createGain();
    outGain.connect(panner);
    panner.connect(this.dryBus);
    panner.connect(this.reverbSend);
    panner.connect(this.delaySend);

    switch (timbre) {
      case InstrumentTimbre.FeltPiano: {
        // Warm wool-damped upright piano: triangle fundamental + soft 2nd harmonic + lowpass hammer decay
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 2, time);

        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.22, time);
        g2.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(freq * 3.8, time);
        lp.frequency.exponentialRampToValueAtTime(Math.max(260, freq * 1.3), time + duration * 0.7);

        outGain.gain.setValueAtTime(0.0001, time);
        outGain.gain.linearRampToValueAtTime(velocity, time + 0.022);
        outGain.gain.exponentialRampToValueAtTime(0.0008, time + duration);

        osc1.connect(lp);
        osc2.connect(g2);
        g2.connect(lp);
        lp.connect(outGain);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration + 0.05);
        osc2.stop(time + duration + 0.05);
        break;
      }

      case InstrumentTimbre.ConcertHarp:
      case InstrumentTimbre.NylonGuitar: {
        // Plucked string resonance: bright initial transient decaying swiftly into pure warm wood body
        const isHarp = timbre === InstrumentTimbre.ConcertHarp;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = isHarp ? 'triangle' : 'sawtooth';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * (isHarp ? 3 : 2), time);

        const harmGain = ctx.createGain();
        harmGain.gain.setValueAtTime(0.28, time);
        harmGain.gain.exponentialRampToValueAtTime(0.002, time + 0.18);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = isHarp ? 1.2 : 2.0;
        filter.frequency.setValueAtTime(freq * (isHarp ? 6.0 : 4.5), time);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.25, time + 0.35);

        outGain.gain.setValueAtTime(0.0001, time);
        outGain.gain.linearRampToValueAtTime(velocity * 1.1, time + 0.008);
        outGain.gain.exponentialRampToValueAtTime(0.0008, time + duration);

        osc1.connect(filter);
        osc2.connect(harmGain);
        harmGain.connect(filter);
        filter.connect(outGain);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration + 0.05);
        osc2.stop(time + duration + 0.05);
        break;
      }

      case InstrumentTimbre.VintageRhodes: {
        // Classic electric tine piano: gentle FM bell overtone + warm sine body
        const carrier = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();

        carrier.type = 'sine';
        mod.type = 'sine';
        carrier.frequency.setValueAtTime(freq, time);
        mod.frequency.setValueAtTime(freq * 7, time); // Tine harmonic ratio

        modGain.gain.setValueAtTime(freq * 0.95, time);
        modGain.gain.exponentialRampToValueAtTime(1.0, time + 0.28);

        outGain.gain.setValueAtTime(0.0001, time);
        outGain.gain.linearRampToValueAtTime(velocity, time + 0.014);
        outGain.gain.exponentialRampToValueAtTime(0.0008, time + duration);

        mod.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(outGain);

        carrier.start(time);
        mod.start(time);
        carrier.stop(time + duration + 0.05);
        mod.stop(time + duration + 0.05);
        break;
      }

      case InstrumentTimbre.RosewoodMarimba: {
        // Warm wooden mallet bar: fundamental + 4th harmonic (2 octaves up) with wooden strike
        const osc1 = ctx.createOscillator();
        const osc4 = ctx.createOscillator();
        const g4 = ctx.createGain();

        osc1.type = 'sine';
        osc4.type = 'sine';
        osc1.frequency.setValueAtTime(freq, time);
        osc4.frequency.setValueAtTime(freq * 4, time);

        g4.gain.setValueAtTime(0.35, time);
        g4.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

        const malletDur = Math.min(duration, 1.35);
        outGain.gain.setValueAtTime(0.0001, time);
        outGain.gain.linearRampToValueAtTime(velocity * 1.2, time + 0.006);
        outGain.gain.exponentialRampToValueAtTime(0.0008, time + malletDur);

        osc1.connect(outGain);
        osc4.connect(g4);
        g4.connect(outGain);

        osc1.start(time);
        osc4.start(time);
        osc1.stop(time + malletDur + 0.05);
        osc4.stop(time + malletDur + 0.05);
        break;
      }

      case InstrumentTimbre.BowedGlass: {
        // Slow-attack crystalline ambient pad swell with subtle shimmer
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 2.003, time);

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1800, time);

        const g2 = ctx.createGain();
        g2.gain.value = 0.18;

        const attack = Math.min(0.85, duration * 0.35);
        outGain.gain.setValueAtTime(0.0001, time);
        outGain.gain.linearRampToValueAtTime(velocity * 0.9, time + attack);
        outGain.gain.exponentialRampToValueAtTime(0.0008, time + duration);

        osc1.connect(lp);
        osc2.connect(g2);
        g2.connect(lp);
        lp.connect(outGain);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration + 0.05);
        osc2.stop(time + duration + 0.05);
        break;
      }

      case InstrumentTimbre.WarmVibraphone: {
        // Motor vibraphone: pure metallic chime with gentle 5.2 Hz amplitude tremolo
        const osc1 = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoDepth = ctx.createGain();
        const tremoloNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, time);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(5.2, time);
        lfoDepth.gain.value = 0.22;
        tremoloNode.gain.value = 0.78;

        outGain.gain.setValueAtTime(0.0001, time);
        outGain.gain.linearRampToValueAtTime(velocity * 1.05, time + 0.012);
        outGain.gain.exponentialRampToValueAtTime(0.0008, time + duration * 1.15);

        lfo.connect(lfoDepth);
        lfoDepth.connect(tremoloNode.gain);
        osc1.connect(tremoloNode);
        tremoloNode.connect(outGain);

        osc1.start(time);
        lfo.start(time);
        osc1.stop(time + duration * 1.15 + 0.05);
        lfo.stop(time + duration * 1.15 + 0.05);
        break;
      }
    }
  }

  private playMorningShimmer(baseMidi: number, time: number): void {
    if (!this.ctx || !this.reverbSend) return;
    const ctx = this.ctx;
    const freq = midiToFreq(baseMidi + 12);

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const pan = ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.12, time + 0.07);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.99, time + 0.16);

    pan.pan.setValueAtTime((Math.random() - 0.5) * 1.2, time);

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(0.032, time + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

    osc.connect(env);
    env.connect(pan);
    pan.connect(this.reverbSend);

    osc.start(time);
    osc.stop(time + 0.26);
  }
}

export const musicEngine = new DailyMusicEngine();
