import './style.css';
import { TimelineEngine } from './engine/timeline-engine.js';
import { AudibleMetronome } from './playback/audible-metronome.js';
import { LyricPlaybackController } from './playback/lyric-playback-controller.js';
import { loadSelectedSong } from '#song-loader';
import {
  GUITAR_PICKING_PATTERN,
  getGuitarPracticeState,
  pickActionName,
} from './practice/guitar-practice.js';
import { step16ToBeatSubdivision, tickToStep16 } from './song/timing.js';

const sectionNames = { VERSE: '主歌', CHORUS: '副歌', OUTRO: '尾句' };
const element = (id) => document.getElementById(id);

function eventStep16(event, ppq) {
  return event.step16 ?? tickToStep16(event.onsetTicks, ppq);
}

function createCell(className, text) {
  const cell = document.createElement('span');
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function createMeasureCard(measure, ppq) {
  const card = document.createElement('article');
  card.className = 'measure-card';
  card.dataset.measure = String(measure.timelineMeasureIndex);

  const heading = document.createElement('header');
  heading.className = 'measure-card-heading';
  heading.innerHTML = `<span>${sectionNames[measure.sectionType]}</span><strong>M${measure.measureIndex}</strong><small>#${measure.timelineMeasureIndex + 1}</small>`;
  card.append(heading);

  const grid = document.createElement('div');
  grid.className = 'step-grid';
  const labelRow = document.createElement('div');
  labelRow.className = 'step-row label-row';
  const lyricRow = document.createElement('div');
  lyricRow.className = 'step-row lyric-row';
  const guitarCaption = document.createElement('div');
  guitarCaption.className = 'row-caption';
  guitarCaption.textContent = '右手触弦 · 根 3 2 3｜根 3 2 3';
  const guitarRow = document.createElement('div');
  guitarRow.className = 'step-row guitar-row';
  const eventsByStep = new Map(measure.lyricEvents.map((event) => [eventStep16(event, ppq), event]));

  for (let step16 = 0; step16 < 16; step16 += 1) {
    const position = step16ToBeatSubdivision(step16);
    const label = position.subdivision === '1' ? String(position.beat) : position.subdivision;
    const labelCell = createCell(`step-cell sub-label sub-${position.subdivisionIndex}`, label);
    if (step16 % 2 === 0) labelCell.classList.add('metronome-pulse');
    if (step16 === 0) labelCell.classList.add('pulse-primary');
    else if (step16 === 8) labelCell.classList.add('pulse-secondary');
    else if (step16 % 4 === 0) labelCell.classList.add('pulse-beat');
    else if (step16 % 2 === 0) labelCell.classList.add('pulse-offbeat');
    if (step16 > 0 && step16 % 4 === 0) labelCell.classList.add('beat-start');
    labelRow.append(labelCell);

    const event = eventsByStep.get(step16);
    const lyricCell = createCell('step-cell lyric-cell', event?.text ?? '·');
    if (event) {
      lyricCell.classList.add('lyric-event');
      lyricCell.dataset.event = event.occurrenceId;
    }
    if (step16 > 0 && step16 % 4 === 0) lyricCell.classList.add('beat-start');
    lyricRow.append(lyricCell);

    const guitarCell = createCell('step-cell guitar-cell', '·');
    guitarCell.dataset.pickStep = String(step16);
    if (step16 > 0 && step16 % 4 === 0) guitarCell.classList.add('beat-start');
    guitarRow.append(guitarCell);
  }

  const cursorTrack = document.createElement('div');
  cursorTrack.className = 'cursor-track';
  cursorTrack.innerHTML = '<span class="playhead" aria-hidden="true"></span>';
  grid.append(labelRow, lyricRow, guitarCaption, guitarRow, cursorTrack);
  card.append(grid);
  return card;
}

function describePickPosition(pickEvent) {
  const position = step16ToBeatSubdivision(pickEvent.step16);
  const measurePrefix = pickEvent.measureOffset === 1 ? '下一小节 ' : '';
  const subdivision = position.subdivision === '1' ? '' : ` ${position.subdivision}`;
  return `${measurePrefix}第 ${position.beat} 拍${subdivision}`;
}

function applyGuitarPattern(measureList) {
  const eventsByStep = new Map(
    GUITAR_PICKING_PATTERN.events.map((event) => [event.step16, event]),
  );
  measureList.querySelectorAll('.guitar-cell').forEach((cell) => {
    const event = eventsByStep.get(Number(cell.dataset.pickStep));
    cell.classList.remove('pick-root', 'pick-inner', 'active', 'upcoming');
    cell.textContent = event?.label ?? '·';
    if (event) {
      cell.classList.add(event.role === 'root' ? 'pick-root' : 'pick-inner');
      cell.setAttribute('aria-label', event.role === 'root' ? '根音' : `触弦 ${event.label}`);
    } else {
      cell.removeAttribute('aria-label');
    }
  });
}

function buildPickingSequence(container) {
  GUITAR_PICKING_PATTERN.events.forEach((event, index) => {
    const position = step16ToBeatSubdivision(event.step16);
    const cell = document.createElement('span');
    cell.className = `picking-sequence-cell ${event.role === 'root' ? 'pick-root' : 'pick-inner'}`;
    cell.dataset.pickIndex = String(index);
    cell.innerHTML = `<small>${position.subdivision === '1' ? position.beat : '&'}</small><strong>${event.label}</strong>`;
    cell.setAttribute('aria-label', `${describePickPosition(event)} ${pickActionName(event)}`);
    container.append(cell);
  });
}

async function startApp() {
  const songDocument = await loadSelectedSong();
  const engine = new TimelineEngine(songDocument);
  const metronome = new AudibleMetronome({
    ppq: songDocument.metadata.ppq,
    timeSignature: songDocument.metadata.timeSignature,
    totalTicks: engine.timeline.totalTicks,
  });
  const controller = new LyricPlaybackController({ engine, metronome });
  const measureList = element('measure-list');
  const measureSelect = /** @type {HTMLSelectElement} */ (element('measure-select'));
  const bpmInput = /** @type {HTMLInputElement} */ (element('bpm-input'));
  const seekInput = /** @type {HTMLInputElement} */ (element('seek-input'));
  const metronomeEnabled = /** @type {HTMLInputElement} */ (element('metronome-enabled'));
  const metronomeVolume = /** @type {HTMLInputElement} */ (element('metronome-volume'));
  const countdownOverlay = element('countdown-overlay');

  element('song-title').textContent = songDocument.metadata.title;
  bpmInput.value = String(songDocument.metadata.defaultBpm);
  seekInput.max = String(engine.timeline.totalTicks);

  engine.timeline.measures.forEach((measure) => {
    measureList.append(createMeasureCard(measure, songDocument.metadata.ppq));
    const option = document.createElement('option');
    option.value = String(measure.timelineMeasureIndex);
    option.textContent = `${measure.timelineMeasureIndex + 1}. ${sectionNames[measure.sectionType]} M${measure.measureIndex}`;
    measureSelect.append(option);
  });

  applyGuitarPattern(measureList);
  buildPickingSequence(element('picking-sequence'));

  let activeMeasureIndex = -1;
  let activeEventId = null;
  let activePickCell = null;
  let upcomingPickCell = null;
  let activeSequenceCell = null;
  let upcomingSequenceCell = null;
  let practiceLyricMeasureIndex = -1;
  let activePracticeLyricId = null;
  let practiceLyricCells = new Map();

  function renderPracticeLyric(state) {
    const line = element('practice-lyric-line');
    const timelineMeasure = engine.timeline.measures[state.timelineMeasureIndex];
    if (practiceLyricMeasureIndex !== state.timelineMeasureIndex) {
      practiceLyricMeasureIndex = state.timelineMeasureIndex;
      activePracticeLyricId = null;
      practiceLyricCells = new Map();
      line.replaceChildren();

      if (timelineMeasure.lyricEvents.length === 0) {
        const empty = createCell('practice-lyric-empty', '（本小节无歌词）');
        line.append(empty);
      } else {
        timelineMeasure.lyricEvents.forEach((event) => {
          const lyricCell = createCell('practice-lyric-char', event.text);
          lyricCell.dataset.practiceEvent = event.occurrenceId;
          practiceLyricCells.set(event.occurrenceId, lyricCell);
          line.append(lyricCell);
        });
      }
    }

    const currentEventId = state.currentLyricEvent?.occurrenceId ?? null;
    if (activePracticeLyricId !== currentEventId) {
      if (activePracticeLyricId) {
        practiceLyricCells.get(activePracticeLyricId)?.classList.remove('active');
      }
      activePracticeLyricId = currentEventId;
      if (activePracticeLyricId) {
        practiceLyricCells.get(activePracticeLyricId)?.classList.add('active');
      }
    }

    if (state.currentLyricEvent?.text) {
      const prefix = practiceLyricCells.has(state.currentLyricEvent.occurrenceId)
        ? '现在唱'
        : '延续上一字';
      element('lyric-value').textContent = `${prefix}：${state.currentLyricEvent.text}`;
    } else if (timelineMeasure.lyricEvents[0]) {
      element('lyric-value').textContent = `准备：${timelineMeasure.lyricEvents[0].text}`;
    } else {
      element('lyric-value').textContent = '本小节为空拍';
    }
  }

  function renderGuitarPractice(state) {
    const practice = getGuitarPracticeState({
      measureTicks: state.measureTicks,
      measureLengthTicks: state.measureLengthTicks,
      ppq: songDocument.metadata.ppq,
      timeSignature: songDocument.metadata.timeSignature,
    });
    const cue = element('guitar-cue');
    const isCountingIn = state.countInRemaining !== null;
    const isActivelyPlaying = state.isPlaying && !isCountingIn;
    const showCurrentPick = isCountingIn
      || (isActivelyPlaying && practice.isHit)
      || (!state.isPlaying && practice.isHit);
    const shownPick = showCurrentPick ? practice.currentPick : practice.nextPick;
    let cueState = 'idle';
    let cueStatus = '按播放开始';
    if (isCountingIn) {
      cueState = 'prepare';
      cueStatus = '倒计时后开始';
    } else if (isActivelyPlaying && practice.isHit) {
      cueState = 'hit';
      cueStatus = '现在弹';
    } else if (isActivelyPlaying && practice.isPreparing) {
      cueState = 'prepare';
      cueStatus = '准备';
    } else if (isActivelyPlaying) {
      cueState = 'follow';
      cueStatus = '跟稳节拍';
    }

    cue.dataset.state = cueState;
    cue.classList.toggle('root-cue', shownPick.role === 'root');
    element('guitar-cue-status').textContent = cueStatus;
    element('guitar-cue-token').textContent = shownPick.label;
    element('guitar-cue-action').textContent = pickActionName(shownPick);
    element('guitar-cue-position').textContent = describePickPosition(shownPick);
    element('guitar-next-action').textContent = `下一次：${describePickPosition(practice.nextPick)} · ${practice.nextPick.label} ${pickActionName(practice.nextPick)}`;
    element('guitar-readiness').style.width = `${isActivelyPlaying ? practice.readiness * 100 : 0}%`;

    activePickCell?.classList.remove('active');
    upcomingPickCell?.classList.remove('upcoming');
    activeSequenceCell?.classList.remove('active');
    upcomingSequenceCell?.classList.remove('upcoming');
    activePickCell = null;
    upcomingPickCell = null;
    activeSequenceCell = null;
    upcomingSequenceCell = null;
    if (isActivelyPlaying && practice.isHit) {
      activePickCell = measureList.querySelector(
        `[data-measure="${state.timelineMeasureIndex}"] [data-pick-step="${practice.currentPick.step16}"]`,
      );
      activePickCell?.classList.add('active');
      activeSequenceCell = element('picking-sequence').querySelector(
        `[data-pick-index="${practice.currentPick.index}"]`,
      );
      activeSequenceCell?.classList.add('active');
    }
    const timelineUpcomingPick = isActivelyPlaying ? practice.nextPick : shownPick;
    const nextMeasureIndex = state.timelineMeasureIndex
      + (timelineUpcomingPick.measureOffset ?? 0);
    upcomingPickCell = measureList.querySelector(
      `[data-measure="${nextMeasureIndex}"] [data-pick-step="${timelineUpcomingPick.step16}"]`,
    );
    upcomingPickCell?.classList.add('upcoming');
    upcomingSequenceCell = element('picking-sequence').querySelector(
      `[data-pick-index="${timelineUpcomingPick.index}"]`,
    );
    upcomingSequenceCell?.classList.add('upcoming');
  }

  controller.subscribe((state) => {
    const isCountingIn = state.countInRemaining !== null;
    element('play-button').textContent = state.isPlaying
      ? (isCountingIn ? '■ 取消倒计时' : 'Ⅱ 暂停')
      : '▶ 播放';
    element('play-button').classList.toggle('playing', state.isPlaying);
    countdownOverlay.hidden = !isCountingIn;
    if (isCountingIn) element('countdown-value').textContent = String(state.countInRemaining);
    bpmInput.disabled = isCountingIn;
    seekInput.disabled = isCountingIn;
    measureSelect.disabled = isCountingIn;
    metronomeEnabled.disabled = isCountingIn;
    element('section-value').textContent = sectionNames[state.sectionType];
    element('measure-value').textContent = `M${state.measureIndex}`;
    element('beat-value').textContent = `${state.beat} ${state.subdivision}`;
    element('tick-value').textContent = `${Math.round(state.ticks)} / ${state.totalTicks} ticks`;
    seekInput.value = String(Math.round(state.ticks));
    measureSelect.value = String(state.timelineMeasureIndex);
    renderPracticeLyric(state);
    renderGuitarPractice(state);

    if (activeEventId !== state.currentLyricEvent?.occurrenceId) {
      if (activeEventId) measureList.querySelector(`[data-event="${activeEventId}"]`)?.classList.remove('active');
      activeEventId = state.currentLyricEvent?.occurrenceId ?? null;
      if (activeEventId) measureList.querySelector(`[data-event="${activeEventId}"]`)?.classList.add('active');
    }

    const currentCard = /** @type {HTMLElement | null} */ (
      measureList.querySelector(`[data-measure="${state.timelineMeasureIndex}"]`)
    );
    currentCard?.style.setProperty('--playhead', `${(state.measureTicks / state.measureLengthTicks) * 100}%`);
    if (activeMeasureIndex !== state.timelineMeasureIndex) {
      if (activeMeasureIndex >= 0) {
        measureList.querySelector(`[data-measure="${activeMeasureIndex}"]`)?.classList.remove('current');
      }
      activeMeasureIndex = state.timelineMeasureIndex;
      currentCard?.classList.add('current');
      if (currentCard) {
        const listRect = measureList.getBoundingClientRect();
        const cardRect = currentCard.getBoundingClientRect();
        const centeredTop = measureList.scrollTop
          + (cardRect.top - listRect.top)
          - ((measureList.clientHeight - currentCard.clientHeight) / 2);
        measureList.scrollTo({
          top: centeredTop,
          behavior: state.isPlaying ? 'smooth' : 'auto',
        });
      }
    }
  });

  element('play-button').addEventListener('click', async () => {
    const playButton = /** @type {HTMLButtonElement} */ (element('play-button'));
    playButton.disabled = true;
    try {
      await controller.togglePlayback();
    } finally {
      playButton.disabled = false;
    }
    if (metronome.enabled && controller.clock.playing && !metronome.isReady) {
      metronomeEnabled.checked = false;
      await controller.setMetronomeEnabled(false);
      const message = element('error-message');
      message.hidden = false;
      message.textContent = '当前浏览器不支持 Web Audio，已继续进行无声播放。';
    }
  });
  element('restart-button').addEventListener('click', () => controller.restart());
  bpmInput.addEventListener('change', () => {
    const bpm = Number(bpmInput.value);
    if (bpm >= 30 && bpm <= 240) controller.setBpm(bpm);
    else bpmInput.value = String(controller.clock.bpm);
  });
  seekInput.addEventListener('input', () => controller.seekTicks(Number(seekInput.value)));
  measureSelect.addEventListener('change', () => controller.seekMeasure(Number(measureSelect.value)));
  metronomeEnabled.addEventListener('change', async () => {
    const ready = await controller.setMetronomeEnabled(metronomeEnabled.checked);
    if (metronomeEnabled.checked && !ready) {
      metronomeEnabled.checked = false;
      const message = element('error-message');
      message.hidden = false;
      message.textContent = '当前浏览器不支持 Web Audio，无法开启节拍声。';
    }
  });
  metronomeVolume.addEventListener('input', () => {
    controller.setMetronomeVolume(Number(metronomeVolume.value) / 100);
  });
  element('debug-mode').addEventListener('click', () => {
    measureList.classList.replace('compact-mode', 'debug-mode');
    element('debug-mode').classList.add('active');
    element('compact-mode').classList.remove('active');
  });
  element('compact-mode').addEventListener('click', () => {
    measureList.classList.replace('debug-mode', 'compact-mode');
    element('compact-mode').classList.add('active');
    element('debug-mode').classList.remove('active');
  });

  globalThis.addEventListener('beforeunload', () => controller.dispose());
}

startApp().catch((error) => {
  const message = element('error-message');
  message.hidden = false;
  message.textContent = error instanceof Error ? error.message : '播放器初始化失败。';
});
