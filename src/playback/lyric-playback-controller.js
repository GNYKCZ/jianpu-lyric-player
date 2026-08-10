import { MasterPlaybackClock } from './master-playback-clock.js';

function browserScheduleFrame(callback) {
  return globalThis.requestAnimationFrame?.(callback) ?? null;
}

function browserCancelFrame(handle) {
  if (handle !== null) globalThis.cancelAnimationFrame?.(handle);
}

export class LyricPlaybackController {
  constructor({
    engine,
    metronome = null,
    countInSeconds = 5,
    now = undefined,
    scheduleFrame = browserScheduleFrame,
    cancelFrame = browserCancelFrame,
  }) {
    this.engine = engine;
    this.metronome = metronome;
    this.countInSeconds = countInSeconds;
    this.countInEndsAtMs = null;
    this.clock = new MasterPlaybackClock({
      ppq: engine.document.metadata.ppq,
      bpm: engine.document.metadata.defaultBpm,
      totalTicks: engine.timeline.totalTicks,
      now,
    });
    this.scheduleFrame = scheduleFrame;
    this.cancelFrame = cancelFrame;
    this.frameHandle = null;
    this.listeners = new Set();
    this.onFrame = this.onFrame.bind(this);
  }

  getState() {
    const now = this.clock.now();
    const countInRemaining = this.clock.playing
      && this.countInEndsAtMs !== null
      && now < this.countInEndsAtMs
      ? Math.min(this.countInSeconds, Math.ceil((this.countInEndsAtMs - now) / 1000))
      : null;
    return Object.freeze({
      ...this.engine.getStateAtTicks(this.clock.getCurrentTicks(now)),
      bpm: this.clock.bpm,
      isPlaying: this.clock.playing,
      countInRemaining,
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
    return state;
  }

  requestFrame() {
    if (this.frameHandle === null && this.clock.playing) {
      this.frameHandle = this.scheduleFrame(this.onFrame);
    }
  }

  onFrame() {
    this.frameHandle = null;
    if (this.countInEndsAtMs !== null && this.clock.now() >= this.countInEndsAtMs) {
      this.countInEndsAtMs = null;
    }
    const state = this.notify();
    if (state.isComplete) {
      this.clock.pause();
      this.metronome?.cancelScheduled();
      this.notify();
      return;
    }
    this.requestFrame();
  }

  async play() {
    if (this.clock.playing) return;
    const startTicks = this.clock.getCurrentTicks();
    const metronomeReady = await this.metronome?.prepare() ?? false;
    const leadSeconds = metronomeReady ? this.metronome.startLeadSeconds : 0;
    const shouldCountIn = startTicks === 0 && this.countInSeconds > 0;
    const countInDuration = shouldCountIn ? this.countInSeconds : 0;
    const playbackStartsAtMs = this.clock.now() + ((leadSeconds + countInDuration) * 1000);
    this.countInEndsAtMs = shouldCountIn ? playbackStartsAtMs : null;
    this.clock.play(playbackStartsAtMs);
    if (metronomeReady) {
      const audioStartTime = this.metronome.context.currentTime + leadSeconds;
      if (shouldCountIn) {
        this.metronome.scheduleCountIn({
          seconds: this.countInSeconds,
          audioStartTime,
        });
      }
      this.metronome.scheduleFrom({
        ticks: startTicks,
        bpm: this.clock.bpm,
        audioStartTime: audioStartTime + countInDuration,
        replace: !shouldCountIn,
      });
    }
    this.notify();
    this.requestFrame();
  }

  pause() {
    this.clock.pause();
    this.countInEndsAtMs = null;
    this.metronome?.cancelScheduled();
    if (this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.notify();
  }

  async togglePlayback() {
    if (this.clock.playing) this.pause();
    else await this.play();
  }

  restart() {
    const leadSeconds = this.clock.playing && this.metronome?.isReady
      ? this.metronome.startLeadSeconds
      : 0;
    const shouldCountIn = this.clock.playing && this.countInSeconds > 0;
    const countInDuration = shouldCountIn ? this.countInSeconds : 0;
    const playbackStartsAtMs = this.clock.now() + ((leadSeconds + countInDuration) * 1000);
    this.countInEndsAtMs = shouldCountIn ? playbackStartsAtMs : null;
    this.clock.restart(playbackStartsAtMs);
    if (this.clock.playing && this.metronome?.isReady) {
      const audioStartTime = this.metronome.context.currentTime + leadSeconds;
      if (shouldCountIn) {
        this.metronome.scheduleCountIn({
          seconds: this.countInSeconds,
          audioStartTime,
        });
      }
      this.metronome.scheduleFrom({
        ticks: 0,
        bpm: this.clock.bpm,
        audioStartTime: audioStartTime + countInDuration,
        replace: !shouldCountIn,
      });
    }
    this.notify();
    this.requestFrame();
  }

  setBpm(bpm) {
    if (this.getState().countInRemaining !== null) return false;
    this.clock.setBpm(bpm);
    this.metronome?.syncFuture(this.clock);
    this.notify();
    return true;
  }

  seekTicks(ticks) {
    this.countInEndsAtMs = null;
    const leadSeconds = this.clock.playing && this.metronome?.isReady
      ? this.metronome.startLeadSeconds
      : 0;
    this.clock.seek(ticks, this.clock.now() + (leadSeconds * 1000));
    if (this.clock.playing && this.metronome?.isReady) {
      this.metronome.scheduleFrom({
        ticks: this.clock.anchorTicks,
        bpm: this.clock.bpm,
        audioStartTime: this.metronome.context.currentTime + leadSeconds,
      });
    }
    this.notify();
    this.requestFrame();
  }

  async setMetronomeEnabled(enabled) {
    return this.metronome?.setEnabled(enabled, this.clock) ?? false;
  }

  setMetronomeVolume(volume) {
    this.metronome?.setVolume(volume);
  }

  seekMeasure(timelineMeasureIndex) {
    const measure = this.engine.timeline.measures[timelineMeasureIndex];
    if (!measure) {
      throw new RangeError('timelineMeasureIndex is outside the performance sequence.');
    }
    this.seekTicks(measure.startTicks);
  }

  dispose() {
    if (this.frameHandle !== null) this.cancelFrame(this.frameHandle);
    this.frameHandle = null;
    this.listeners.clear();
    void this.metronome?.dispose();
  }
}
