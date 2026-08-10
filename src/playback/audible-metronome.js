import {
  firstMetronomePulseAtOrAfter,
  getMetronomePulse,
  metronomePulseTicks,
  METRONOME_ACCENTS,
} from './metronome-pattern.js';

const DRUM_PROFILES = Object.freeze({
  [METRONOME_ACCENTS.PRIMARY]: Object.freeze({
    kind: 'kick', frequency: 145, pitchDrop: 140, level: 1, duration: 0.09, decay: 46,
  }),
  [METRONOME_ACCENTS.SECONDARY]: Object.freeze({
    kind: 'kick', frequency: 172, pitchDrop: 96, level: 0.68, duration: 0.075, decay: 56,
  }),
  [METRONOME_ACCENTS.BEAT]: Object.freeze({
    kind: 'snare', frequency: 235, pitchDrop: 0, level: 0.42, duration: 0.065, decay: 60,
  }),
  [METRONOME_ACCENTS.OFFBEAT]: Object.freeze({
    kind: 'hat', frequency: 7600, pitchDrop: 0, level: 0.14, duration: 0.03, decay: 140,
  }),
});

const bufferCache = new WeakMap();

function defaultAudioContextFactory() {
  if (!globalThis.AudioContext) return null;
  return new globalThis.AudioContext({ latencyHint: 'interactive' });
}

function deterministicNoise(index) {
  const value = Math.sin((index + 1) * 12.9898) * 43758.5453;
  return ((value - Math.floor(value)) * 2) - 1;
}

export function renderDrumSamples(sampleRate, accent) {
  const profile = DRUM_PROFILES[accent];
  if (!profile) throw new RangeError(`Unknown metronome accent: ${accent}`);
  const samples = new Float32Array(Math.ceil(sampleRate * profile.duration));
  let phase = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    const attack = Math.min(1, time / 0.00045);
    const envelope = attack * Math.exp(-time * profile.decay);
    const noise = deterministicNoise(index);

    if (profile.kind === 'hat') {
      const metallic = Math.sin(2 * Math.PI * profile.frequency * time)
        * Math.sin(2 * Math.PI * profile.frequency * 1.417 * time);
      samples[index] = profile.level * envelope * ((noise * 0.72) + (metallic * 0.28));
      continue;
    }

    if (profile.kind === 'snare') {
      phase += (2 * Math.PI * profile.frequency) / sampleRate;
      const drumHead = Math.sin(phase) + (Math.sin(phase * 1.61) * 0.35);
      const wireEnvelope = Math.exp(-time * 72);
      samples[index] = profile.level * envelope
        * ((drumHead * 0.28) + (noise * wireEnvelope * 0.72));
      continue;
    }

    const frequency = profile.frequency + (profile.pitchDrop * Math.exp(-time * 38));
    phase += (2 * Math.PI * frequency) / sampleRate;
    const body = Math.sin(phase);
    const skin = Math.sin(phase * 1.83);
    const beater = Math.sin(2 * Math.PI * 2600 * time);
    const transientEnvelope = Math.exp(-time * 210);
    const transient = ((beater * 0.65) + (noise * 0.35)) * transientEnvelope;
    const mixed = (body * 0.55) + (skin * 0.17) + (transient * 0.28);
    const saturated = Math.tanh(mixed * 1.65) / Math.tanh(1.65);
    samples[index] = profile.level * envelope * saturated;
  }
  return samples;
}

function getClickBuffer(context, accent) {
  let contextBuffers = bufferCache.get(context);
  if (!contextBuffers) {
    contextBuffers = new Map();
    bufferCache.set(context, contextBuffers);
  }
  if (contextBuffers.has(accent)) return contextBuffers.get(accent);

  const samples = renderDrumSamples(context.sampleRate, accent);
  const buffer = context.createBuffer(1, samples.length, context.sampleRate);
  buffer.copyToChannel(samples, 0);
  contextBuffers.set(accent, buffer);
  return buffer;
}

function defaultClickRenderer({ context, destination, when, accent }) {
  const source = context.createBufferSource();
  source.buffer = getClickBuffer(context, accent);
  source.connect(destination);
  source.start(when);
  return source;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export class AudibleMetronome {
  constructor({
    ppq,
    timeSignature,
    totalTicks,
    enabled = true,
    volume = 0.75,
    startLeadSeconds = 0.025,
    audioContextFactory = defaultAudioContextFactory,
    clickRenderer = defaultClickRenderer,
  }) {
    metronomePulseTicks(ppq, timeSignature);
    this.ppq = ppq;
    this.timeSignature = timeSignature;
    this.totalTicks = totalTicks;
    this.enabled = enabled;
    this.volume = clamp(volume, 0, 1);
    this.startLeadSeconds = startLeadSeconds;
    this.audioContextFactory = audioContextFactory;
    this.clickRenderer = clickRenderer;
    this.context = null;
    this.output = null;
    this.scheduledSources = new Set();
  }

  get isReady() {
    return this.context !== null && this.output !== null;
  }

  async prepare() {
    if (!this.enabled) return false;
    try {
      if (!this.context) {
        this.context = this.audioContextFactory();
        if (!this.context) return false;
        this.output = this.context.createGain();
        this.output.gain.value = this.volume;
        this.output.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch {
      this.cancelScheduled();
      this.context = null;
      this.output = null;
      return false;
    }
  }

  scheduleFrom({ ticks, bpm, audioStartTime, firstTicks = ticks }) {
    if (!this.enabled || !this.isReady) return [];
    this.cancelScheduled();
    const ticksPerSecond = (this.ppq * bpm) / 60;
    const pulseTicks = metronomePulseTicks(this.ppq, this.timeSignature);
    const firstPulse = firstMetronomePulseAtOrAfter(firstTicks, this.ppq, this.timeSignature);
    const scheduled = [];

    for (let pulseTicksPosition = firstPulse;
      pulseTicksPosition < this.totalTicks;
      pulseTicksPosition += pulseTicks) {
      const pulse = getMetronomePulse(
        pulseTicksPosition,
        this.ppq,
        this.timeSignature,
      );
      const when = audioStartTime + ((pulseTicksPosition - ticks) / ticksPerSecond);
      const source = this.clickRenderer({
        context: this.context,
        destination: this.output,
        when,
        accent: pulse.accent,
      });
      this.scheduledSources.add(source);
      source.onended = () => this.scheduledSources.delete(source);
      scheduled.push(Object.freeze({ ...pulse, when }));
    }
    return scheduled;
  }

  syncFuture(clock) {
    if (!this.enabled || !this.isReady || !clock.playing) return [];
    const currentTicks = clock.getCurrentTicks();
    const ticksPerSecond = (this.ppq * clock.bpm) / 60;
    const safeTicks = currentTicks + (ticksPerSecond * this.startLeadSeconds);
    return this.scheduleFrom({
      ticks: currentTicks,
      bpm: clock.bpm,
      audioStartTime: this.context.currentTime,
      firstTicks: safeTicks,
    });
  }

  cancelScheduled() {
    const sources = [...this.scheduledSources];
    this.scheduledSources.clear();
    sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // A source may already have ended between collection and cancellation.
      }
    });
  }

  setVolume(volume) {
    this.volume = clamp(volume, 0, 1);
    if (!this.output) return;
    this.output.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.01);
  }

  async setEnabled(enabled, clock) {
    this.enabled = enabled;
    if (!enabled) {
      this.cancelScheduled();
      return false;
    }
    const ready = await this.prepare();
    if (ready && clock?.playing) this.syncFuture(clock);
    return ready;
  }

  async dispose() {
    this.cancelScheduled();
    if (this.context && this.context.state !== 'closed') {
      try {
        await this.context.close();
      } catch {
        // Closing is best-effort during page teardown.
      }
    }
    this.context = null;
    this.output = null;
  }
}

export { DRUM_PROFILES };
