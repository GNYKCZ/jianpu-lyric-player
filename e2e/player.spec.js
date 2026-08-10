import { test, expect } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { demoSong } from '../test/fixtures/demo-song.js';

const localFixturePath = path.resolve('local-fixtures', 'e2e_local.json');

test.beforeAll(async () => {
  await mkdir(path.dirname(localFixturePath), { recursive: true });
  const localSong = structuredClone(demoSong);
  localSong.metadata.title = 'Local Fixture Test';
  await writeFile(localFixturePath, JSON.stringify(localSong), 'utf8');
});

test.afterAll(async () => {
  await rm(localFixturePath, { force: true });
});

test('demo player loads and its transport controls stay synchronized', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#song-title')).toContainText('向光而行');
  await expect(page.locator('.measure-card')).toHaveCount(11);
  await expect(page.locator('.measure-card.current')).toContainText('主歌');
  await expect(page.locator('.lyric-event.active')).toHaveText('今');
  await expect(page.locator('#metronome-enabled')).toBeChecked();
  await expect(page.locator('.measure-card').first().locator('.pulse-primary')).toHaveCount(1);
  await expect(page.locator('.measure-card').first().locator('.pulse-secondary')).toHaveCount(1);
  await expect(page.locator('.measure-card').first().locator('.pulse-beat')).toHaveCount(2);
  await expect(page.locator('.measure-card').first().locator('.pulse-offbeat')).toHaveCount(4);
  await expect(page.locator('#guitar-cue')).toBeVisible();
  await expect(page.locator('#guitar-cue-status')).toHaveText('按播放开始');
  await expect(page.locator('#guitar-cue-position')).toHaveText('第 1 拍');
  await expect(page.locator('#guitar-cue-token')).toHaveText('根');
  await expect(page.locator('#picking-sequence .picking-sequence-cell')).toHaveCount(8);
  await expect(page.locator('#picking-sequence .pick-root')).toHaveCount(2);
  await expect(page.locator('#picking-sequence .pick-inner')).toHaveCount(6);
  await expect(page.locator('.measure-card').first().locator('.guitar-cell.pick-root')).toHaveCount(2);
  await expect(page.locator('.measure-card').first().locator('.guitar-cell.pick-inner')).toHaveCount(6);
  await expect(page.locator('.measure-card').first().locator('.guitar-cell.pick-root, .guitar-cell.pick-inner')).toHaveText([
    '根', '3', '2', '3', '根', '3', '2', '3',
  ]);

  await page.locator('#compact-mode').click();
  await expect(page.locator('#measure-list')).toHaveClass(/compact-mode/);
  await page.locator('#debug-mode').click();
  await expect(page.locator('#measure-list')).toHaveClass(/debug-mode/);

  await page.locator('#measure-select').selectOption('2');
  await expect(page.locator('#section-value')).toHaveText('副歌');
  await expect(page.locator('#measure-value')).toHaveText('M1');
  await expect(page.locator('.measure-card.current')).toContainText('#3');
  await expect(page.locator('.lyric-event.active')).toHaveText('向');

  await page.locator('#bpm-input').fill('120');
  await page.locator('#bpm-input').blur();
  await page.locator('#play-button').click();
  await expect(page.locator('#metronome-enabled')).toBeChecked();
  await expect(page.locator('#play-button')).toContainText('暂停');
  await page.waitForTimeout(250);
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('播放');

  const pausedTicks = await page.locator('#tick-value').textContent();
  await page.waitForTimeout(250);
  await expect(page.locator('#tick-value')).toHaveText(pausedTicks);

  await page.locator('#restart-button').click();
  await expect(page.locator('#tick-value')).toContainText('0 /');
  await expect(page.locator('#section-value')).toHaveText('主歌');

  await page.locator('#metronome-enabled').uncheck();
  await expect(page.locator('#metronome-enabled')).not.toBeChecked();
  await page.locator('#metronome-volume').fill('45');
});

test('measure seek scrolls the selected measure into view', async ({ page }) => {
  await page.goto('/');
  await page.locator('#measure-select').selectOption('10');
  await expect(page.locator('.measure-card.current')).toContainText('尾句');

  await expect.poll(async () => page.locator('.measure-card.current').evaluate((card) => {
    const list = card.parentElement;
    if (!list) return Number.POSITIVE_INFINITY;
    const cardRect = card.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const cardCenter = cardRect.top + (cardRect.height / 2);
    const listCenter = listRect.top + (listRect.height / 2);
    return Math.abs(cardCenter - listCenter);
  })).toBeLessThan(12);
});

test('guitar cue follows all eight master-clock eighth-note positions', async ({ page }) => {
  await page.goto('/');
  const seek = page.locator('#seek-input');
  const cue = page.locator('#guitar-cue');
  const token = page.locator('#guitar-cue-token');
  const expected = ['根', '3', '2', '3', '根', '3', '2', '3'];

  for (let index = 0; index < expected.length; index += 1) {
    await seek.fill(String(index * 240));
    await expect(token).toHaveText(expected[index]);
    await expect(page.locator('#guitar-cue-position')).toContainText(`第 ${Math.floor(index / 2) + 1} 拍`);
    if (index === 0 || index === 4) await expect(cue).toHaveClass(/root-cue/);
    else await expect(cue).not.toHaveClass(/root-cue/);
  }
});

test('starting from the beginning shows a cancellable five-second count-in', async ({ page }) => {
  await page.goto('/');
  await page.locator('#play-button').click();
  await expect(page.locator('#countdown-overlay')).toBeVisible();
  await expect(page.locator('#countdown-value')).toHaveText('5');
  await expect(page.locator('#tick-value')).toContainText('0 /');
  await expect(page.locator('#bpm-input')).toBeDisabled();
  await page.locator('#play-button').click();
  await expect(page.locator('#countdown-overlay')).toBeHidden();
  await expect(page.locator('#play-button')).toContainText('播放');
});

test('development server loads an ignored local fixture by query parameter', async ({ page }) => {
  await page.goto('/?fixture=e2e_local');
  await expect(page.locator('#song-title')).toHaveText('Local Fixture Test');
  await expect(page.locator('.measure-card')).toHaveCount(3);
});
