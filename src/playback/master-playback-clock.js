function defaultNow() {
  return globalThis.performance.now();
}

function assertPositiveFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
}

export class MasterPlaybackClock {
  constructor({ ppq, bpm, totalTicks, now = defaultNow }) {
    assertPositiveFinite(ppq, 'ppq');
    assertPositiveFinite(bpm, 'bpm');
    assertPositiveFinite(totalTicks, 'totalTicks');
    this.ppq = ppq;
    this.bpm = bpm;
    this.totalTicks = totalTicks;
    this.now = now;
    this.playing = false;
    this.anchorTicks = 0;
    this.anchorTimeMs = now();
  }

  get ticksPerMillisecond() {
    return (this.ppq * this.bpm) / 60_000;
  }

  getCurrentTicks(atTimeMs = this.now()) {
    if (!this.playing) {
      return this.anchorTicks;
    }
    const elapsedMs = Math.max(0, atTimeMs - this.anchorTimeMs);
    return Math.min(this.totalTicks, this.anchorTicks + (elapsedMs * this.ticksPerMillisecond));
  }

  play(atTimeMs = this.now()) {
    if (this.playing) return;
    if (this.anchorTicks >= this.totalTicks) {
      this.anchorTicks = 0;
    }
    this.anchorTimeMs = atTimeMs;
    this.playing = true;
  }

  pause(atTimeMs = this.now()) {
    if (!this.playing) return;
    this.anchorTicks = this.getCurrentTicks(atTimeMs);
    this.anchorTimeMs = atTimeMs;
    this.playing = false;
  }

  restart(atTimeMs = this.now()) {
    this.anchorTicks = 0;
    this.anchorTimeMs = atTimeMs;
  }

  seek(ticks, atTimeMs = this.now()) {
    if (typeof ticks !== 'number' || !Number.isFinite(ticks)) {
      throw new RangeError('ticks must be a finite number.');
    }
    this.anchorTicks = Math.min(Math.max(ticks, 0), this.totalTicks);
    this.anchorTimeMs = atTimeMs;
  }

  setBpm(bpm, atTimeMs = this.now()) {
    assertPositiveFinite(bpm, 'bpm');
    this.anchorTicks = this.getCurrentTicks(atTimeMs);
    this.anchorTimeMs = atTimeMs;
    this.bpm = bpm;
  }
}
