/**
 * Procedural ambient audio generation using Web Audio API.
 * Each sound is generated algorithmically — zero pre-recorded samples needed.
 */

type SoundController = {
  setVolume: (v: number) => void;
  stop: () => void;
};

function createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  let lastOut = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;

    if (type === 'white') {
      data[i] = white * 0.5;
    } else if (type === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      // Brown noise
      const out = (lastOut + 0.02 * white) / 1.02;
      lastOut = out;
      data[i] = out * 3.5;
    }
  }

  return buffer;
}

function createNoise(ctx: AudioContext, type: 'white' | 'pink' | 'brown', gain: GainNode): AudioBufferSourceNode {
  const buffer = createNoiseBuffer(ctx, type);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gain);
  return source;
}

export function createRain(ctx: AudioContext, masterGain: GainNode): SoundController {
  const gain = ctx.createGain();
  gain.gain.value = 0.3;
  gain.connect(masterGain);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 4000;
  filter.Q.value = 0.5;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 1;
  noiseGain.connect(filter);
  filter.connect(gain);

  // Slow volume modulation for natural variation
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.15;
  lfo.connect(lfoGain);
  lfoGain.connect(noiseGain.gain);
  lfo.start();

  const source = createNoise(ctx, 'white', noiseGain);
  source.start();

  return {
    setVolume: (v) => { gain.gain.setTargetAtTime(v * 0.3, ctx.currentTime, 0.1); },
    stop: () => { source.stop(); lfo.stop(); },
  };
}

export function createOcean(ctx: AudioContext, masterGain: GainNode): SoundController {
  const gain = ctx.createGain();
  gain.gain.value = 0.25;
  gain.connect(masterGain);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  const noiseGain = ctx.createGain();
  noiseGain.connect(filter);
  filter.connect(gain);

  // Wave rhythm modulation
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.4;
  lfo.connect(lfoGain);
  lfoGain.connect(noiseGain.gain);
  lfo.start();
  noiseGain.gain.value = 0.6;

  const source = createNoise(ctx, 'brown', noiseGain);
  source.start();

  return {
    setVolume: (v) => { gain.gain.setTargetAtTime(v * 0.25, ctx.currentTime, 0.1); },
    stop: () => { source.stop(); lfo.stop(); },
  };
}

export function createForest(ctx: AudioContext, masterGain: GainNode): SoundController {
  const gain = ctx.createGain();
  gain.gain.value = 0.2;
  gain.connect(masterGain);

  // Base rustle
  const rustleFilter = ctx.createBiquadFilter();
  rustleFilter.type = 'lowpass';
  rustleFilter.frequency.value = 300;
  const rustleGain = ctx.createGain();
  rustleGain.gain.value = 0.3;
  rustleGain.connect(rustleFilter);
  rustleFilter.connect(gain);

  const rustleSource = createNoise(ctx, 'pink', rustleGain);
  rustleSource.start();

  // Bird chirps (random sine sweeps)
  let chirpInterval: ReturnType<typeof setInterval> | null = null;
  chirpInterval = setInterval(() => {
    if (ctx.state === 'closed') {
      if (chirpInterval) clearInterval(chirpInterval);
      return;
    }
    const osc = ctx.createOscillator();
    const chirpGain = ctx.createGain();
    const freq = 1500 + Math.random() * 2000;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15);
    chirpGain.gain.setValueAtTime(0.06, ctx.currentTime);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(chirpGain);
    chirpGain.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }, 2000 + Math.random() * 5000);

  return {
    setVolume: (v) => { gain.gain.setTargetAtTime(v * 0.2, ctx.currentTime, 0.1); },
    stop: () => {
      rustleSource.stop();
      if (chirpInterval) clearInterval(chirpInterval);
    },
  };
}

export function createCafe(ctx: AudioContext, masterGain: GainNode): SoundController {
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  gain.connect(masterGain);

  const source = createNoise(ctx, 'brown', gain);
  source.start();

  // Ambient murmur
  let murmurInterval: ReturnType<typeof setInterval> | null = null;
  murmurInterval = setInterval(() => {
    if (ctx.state === 'closed') {
      if (murmurInterval) clearInterval(murmurInterval);
      return;
    }
    const osc = ctx.createOscillator();
    const murmurGain = ctx.createGain();
    osc.frequency.value = 300 + Math.random() * 400;
    murmurGain.gain.setValueAtTime(0.02, ctx.currentTime);
    murmurGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(murmurGain);
    murmurGain.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }, 500 + Math.random() * 1500);

  return {
    setVolume: (v) => { gain.gain.setTargetAtTime(v * 0.15, ctx.currentTime, 0.1); },
    stop: () => {
      source.stop();
      if (murmurInterval) clearInterval(murmurInterval);
    },
  };
}

export function createFireplace(ctx: AudioContext, masterGain: GainNode): SoundController {
  const gain = ctx.createGain();
  gain.gain.value = 0.2;
  gain.connect(masterGain);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.connect(gain);

  const source = createNoise(ctx, 'brown', filter);
  source.start();

  // Crackling
  let crackleInterval: ReturnType<typeof setInterval> | null = null;
  crackleInterval = setInterval(() => {
    if (ctx.state === 'closed') {
      if (crackleInterval) clearInterval(crackleInterval);
      return;
    }
    const bufferSize = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const crackle = ctx.createBufferSource();
    crackle.buffer = buffer;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.15;
    crackle.connect(crackleGain);
    crackleGain.connect(gain);
    crackle.start();
  }, 200 + Math.random() * 600);

  return {
    setVolume: (v) => { gain.gain.setTargetAtTime(v * 0.2, ctx.currentTime, 0.1); },
    stop: () => {
      source.stop();
      if (crackleInterval) clearInterval(crackleInterval);
    },
  };
}

export function createLibrary(ctx: AudioContext, masterGain: GainNode): SoundController {
  const gain = ctx.createGain();
  gain.gain.value = 0.08;
  gain.connect(masterGain);

  const source = createNoise(ctx, 'pink', gain);
  source.start();

  // Occasional clock tick
  let tickInterval: ReturnType<typeof setInterval> | null = null;
  tickInterval = setInterval(() => {
    if (ctx.state === 'closed') {
      if (tickInterval) clearInterval(tickInterval);
      return;
    }
    const osc = ctx.createOscillator();
    const tickGain = ctx.createGain();
    osc.frequency.value = 2500;
    tickGain.gain.setValueAtTime(0.03, ctx.currentTime);
    tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
    osc.connect(tickGain);
    tickGain.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  }, 1000);

  return {
    setVolume: (v) => { gain.gain.setTargetAtTime(v * 0.08, ctx.currentTime, 0.1); },
    stop: () => {
      source.stop();
      if (tickInterval) clearInterval(tickInterval);
    },
  };
}

const SOUND_CREATORS: Record<string, (ctx: AudioContext, master: GainNode) => SoundController> = {
  rain: createRain,
  ocean: createOcean,
  forest: createForest,
  cafe: createCafe,
  fireplace: createFireplace,
  library: createLibrary,
};

export class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSources: Map<string, SoundController> = new Map();

  async initialize(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
  }

  startSound(id: string, volume: number): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.activeSources.has(id)) return;

    const creator = SOUND_CREATORS[id];
    if (!creator) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const controller = creator(this.ctx, this.masterGain);
    controller.setVolume(volume);
    this.activeSources.set(id, controller);
  }

  stopSound(id: string): void {
    const controller = this.activeSources.get(id);
    if (controller) {
      try { controller.stop(); } catch { /* already stopped */ }
      this.activeSources.delete(id);
    }
  }

  setVolume(id: string, volume: number): void {
    this.activeSources.get(id)?.setVolume(volume);
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }
  }

  dispose(): void {
    for (const [id] of this.activeSources) {
      this.stopSound(id);
    }
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
  }
}
