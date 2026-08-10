import './style.css';
import { TimelineEngine } from './engine/timeline-engine.js';
import { LyricPlaybackController } from './playback/lyric-playback-controller.js';
import { loadSongDocument } from './song/song-document.js';
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
  const eventsByStep = new Map(measure.lyricEvents.map((event) => [eventStep16(event, ppq), event]));

  for (let step16 = 0; step16 < 16; step16 += 1) {
    const position = step16ToBeatSubdivision(step16);
    const label = position.subdivision === '1' ? String(position.beat) : position.subdivision;
    const labelCell = createCell(`step-cell sub-label sub-${position.subdivisionIndex}`, label);
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
  }

  const cursorTrack = document.createElement('div');
  cursorTrack.className = 'cursor-track';
  cursorTrack.innerHTML = '<span class="playhead" aria-hidden="true"></span>';
  grid.append(labelRow, lyricRow, cursorTrack);
  card.append(grid);
  return card;
}

async function loadDemoSong() {
  const response = await fetch(new URL('./data/demo-song.json', import.meta.url));
  if (!response.ok) throw new Error(`Demo Song 加载失败（${response.status}）`);
  return loadSongDocument(await response.json());
}

async function startApp() {
  const songDocument = await loadDemoSong();
  const engine = new TimelineEngine(songDocument);
  const controller = new LyricPlaybackController({ engine });
  const measureList = element('measure-list');
  const measureSelect = /** @type {HTMLSelectElement} */ (element('measure-select'));
  const bpmInput = /** @type {HTMLInputElement} */ (element('bpm-input'));
  const seekInput = /** @type {HTMLInputElement} */ (element('seek-input'));

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

  let activeMeasureIndex = -1;
  let activeEventId = null;
  controller.subscribe((state) => {
    element('play-button').textContent = state.isPlaying ? 'Ⅱ 暂停' : '▶ 播放';
    element('play-button').classList.toggle('playing', state.isPlaying);
    element('section-value').textContent = sectionNames[state.sectionType];
    element('measure-value').textContent = `M${state.measureIndex}`;
    element('beat-value').textContent = `${state.beat} ${state.subdivision}`;
    element('lyric-value').textContent = state.currentLyricEvent?.text
      ? `当前歌词：${state.currentLyricEvent.text}`
      : '等待歌词';
    element('tick-value').textContent = `${Math.round(state.ticks)} / ${state.totalTicks} ticks`;
    seekInput.value = String(Math.round(state.ticks));
    measureSelect.value = String(state.timelineMeasureIndex);

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

  element('play-button').addEventListener('click', () => controller.togglePlayback());
  element('restart-button').addEventListener('click', () => controller.restart());
  bpmInput.addEventListener('change', () => {
    const bpm = Number(bpmInput.value);
    if (bpm >= 30 && bpm <= 240) controller.setBpm(bpm);
    else bpmInput.value = String(controller.clock.bpm);
  });
  seekInput.addEventListener('input', () => controller.seekTicks(Number(seekInput.value)));
  measureSelect.addEventListener('change', () => controller.seekMeasure(Number(measureSelect.value)));

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
