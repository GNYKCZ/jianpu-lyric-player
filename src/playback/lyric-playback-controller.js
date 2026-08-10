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
    now = undefined,
    scheduleFrame = browserScheduleFrame,
    cancelFrame = browserCancelFrame,
  }) {
    this.engine = engine;
    this.metronome = metronome;
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
    return Object.freeze({
      ...this.engine.getStateAtTicks(this.clock.getCurrentTicks()),
      bpm: this.clock.bpm,
      isPlaying: this.clock.playing,
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
    this.clock.play(this.clock.now() + (leadSeconds * 1000));
    if (metronomeReady) {
      this.metronome.scheduleFrom({
        ticks: startTicks,
        bpm: this.clock.bpm,
        audioStartTime: this.metronome.context.currentTime + leadSeconds,
      });
    }
    this.notify();
    this.requestFrame();
  }

  pause() {
    this.clock.pause();
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
    this.clock.restart(this.clock.now() + (leadSeconds * 1000));
    if (this.clock.playing && this.metronome?.isReady) {
      this.metronome.scheduleFrom({
        ticks: 0,
        bpm: this.clock.bpm,
        audioStartTime: this.metronome.context.currentTime + leadSeconds,
      });
    }
    this.notify();
    this.requestFrame();
  }

  setBpm(bpm) {
    this.clock.setBpm(bpm);
    this.metronome?.syncFuture(this.clock);
    this.notify();
  }

  seekTicks(ticks) {
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
