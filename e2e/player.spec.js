import { test, expect } from '@playwright/test';

test('demo player loads and its transport controls stay synchronized', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#song-title')).toContainText('向光而行');
  await expect(page.locator('.measure-card')).toHaveCount(11);
  await expect(page.locator('.measure-card.current')).toContainText('主歌');
  await expect(page.locator('.lyric-event.active')).toHaveText('今');

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
