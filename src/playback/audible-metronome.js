import {
  firstMetronomePulseAtOrAfter,
  getMetronomePulse,
  metronomePulseTicks,
  METRONOME_ACCENTS,
} from './metronome-pattern.js';

const CLICK_PROFILES = Object.freeze({
  [METRONOME_ACCENTS.PRIMARY]: Object.freeze({ frequency: 1760, level: 1, duration: 0.055 }),
  [METRONOME_ACCENTS.SECONDARY]: Object.freeze({ frequency: 1397, level: 0.78, duration: 0.05 }),
  [METRONOME_ACCENTS.BEAT]: Object.freeze({ frequency: 1047, level: 0.62, duration: 0.045 }),
  [METRONOME_ACCENTS.OFFBEAT]: Object.freeze({ frequency: 784, level: 0.38, duration: 0.04 }),
});

const bufferCache = new WeakMap();

function defaultAudioContextFactory() {
  if (!globalThis.AudioContext) return null;
  return new globalThis.AudioContext({ latencyHint: 'interactive' });
}

export function renderWoodblockSamples(sampleRate, accent) {
  const profile = CLICK_PROFILES[accent];
  if (!profile) throw new RangeError(`Unknown metronome accent: ${accent}`);
  const samples = new Float32Array(Math.ceil(sampleRate * profile.duration));

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    const attack = Math.min(1, time / 0.0012);
    const envelope = attack * Math.exp(-time * 58);
    const fundamental = Math.sin(2 * Math.PI * profile.frequency * time);
    const overtone = Math.sin(2 * Math.PI * profile.frequency * 2.71 * time);
    samples[index] = profile.level * envelope * ((fundamental * 0.72) + (overtone * 0.28));
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

  const samples = renderWoodblockSamples(context.sampleRate, accent);
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
    volume = 0.65,
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

export { CLICK_PROFILES };
