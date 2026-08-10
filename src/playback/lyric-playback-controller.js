import { MasterPlaybackClock } from './master-playback-clock.js';

function browserScheduleFrame(callback) {
  return globalThis.requestAnimationFrame?.(callback) ?? null;
}

function browserCancelFrame(handle) {
  if (handle !== null) globalThis.cancelAnimationFrame?.(handle);
}

export class LyricPlaybackController {
  constructor({ engine, now = undefined, scheduleFrame = browserScheduleFrame, cancelFrame = browserCancelFrame }) {
    this.engine = engine;
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
      this.notify();
      return;
    }
    this.requestFrame();
  }

  play() {
    this.clock.play();
    this.notify();
    this.requestFrame();
  }

  pause() {
    this.clock.pause();
    if (this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.notify();
  }

  togglePlayback() {
    if (this.clock.playing) this.pause();
    else this.play();
  }

  restart() {
    this.clock.restart();
    this.notify();
    this.requestFrame();
  }

  setBpm(bpm) {
    this.clock.setBpm(bpm);
    this.notify();
  }

  seekTicks(ticks) {
    this.clock.seek(ticks);
    this.notify();
    this.requestFrame();
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
  }
}
