import { test, expect, type Browser, type Page } from '@playwright/test';
import { joinAsBot, playingDeck } from './bot';

async function enter(page: Page, name: string, url?: string) {
  if (url) await page.goto(url); else { await page.goto('/'); await page.getByRole('button', { name: /Start a new room/i }).click(); await page.waitForURL(/\/room\//); }
  await page.getByLabel('Your name').fill(name); await page.getByRole('button', { name: /Enter room/i }).click();
  await expect(page.getByText('Live')).toBeVisible();
}
async function player(browser: Browser, name: string, url?: string) { const context = await browser.newContext(); const page = await context.newPage(); await enter(page, name, url); return page; }
const handDot = (page: Page, owner: string) => page.locator(`.mini-grid i[data-type="region"][data-owner="${owner}"]`);
const cardsInHandOf = (page: Page, owner: string) => page.locator(`.mini-grid i[data-type="card"][data-hand="${owner}"]`);

test('the tutor deals cards to every hand; each player sees only their own', async ({ browser }) => {
  test.slow(test.info().project.name === 'tablet', 'two browsers on the slower tablet profile');
  const maya = await player(browser, 'Maya'); const leo = await player(browser, 'Leo', maya.url());
  for (const page of [maya, leo]) { await page.getByRole('button', { name: /My hand/ }).click(); }
  await expect(maya.locator('.mini-grid i[data-type="region"]')).toHaveCount(2);
  // The deck goes on the table, away from the hands (one at the bottom of the view, the next one row above it).
  await maya.getByRole('button', { name: /Card deck/ }).dragTo(maya.locator('canvas').first(), { targetPosition: { x: 200, y: 140 } });
  const deck = await maya.locator('.mini-grid i[data-type="deck"]').evaluate((n) => ({ x: Number(n.getAttribute('data-x')), y: Number(n.getAttribute('data-y')) }));
  await maya.locator('canvas').first().click({ position: { x: deck.x, y: deck.y + 62 } }); // the count under the deck opens its menu

  await maya.locator('.selection-bar').getByRole('button', { name: 'Deal…' }).click();
  const dialog = maya.getByRole('dialog', { name: 'Deal cards' });
  await expect(dialog).toContainText('To 2 hands'); await expect(dialog).toContainText('Leo');
  await dialog.getByLabel('Cards to each hand').fill('3');
  await dialog.getByRole('button', { name: 'Deal', exact: true }).click(); await expect(dialog).toBeHidden();

  for (const page of [maya, leo]) {
    await expect(handDot(page, 'Maya')).toHaveAttribute('data-count', '3'); await expect(handDot(page, 'Leo')).toHaveAttribute('data-count', '3');
    await expect(page.locator('.mini-grid i[data-type="deck"]')).toHaveAttribute('data-count', '46');
  }
  // Leo sees the faces of his own cards (peek) and only the backs of Maya's; and the other way round.
  await expect(cardsInHandOf(leo, 'Leo')).toHaveCount(3); await expect(cardsInHandOf(leo, 'Maya')).toHaveCount(3);
  for (const face of await cardsInHandOf(leo, 'Leo').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-face')))) expect(face).toMatch(/^\S+[♠♥♦♣]$/);
  for (const face of await cardsInHandOf(leo, 'Maya').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-face')))) expect(face).toBe('');
  for (const face of await cardsInHandOf(maya, 'Leo').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-face')))) expect(face).toBe('');
  // One undo takes the whole deal back.
  await leo.getByTitle('Undo').click();
  await expect(maya.locator('.mini-grid i[data-type="deck"]')).toHaveAttribute('data-count', '52'); await expect(handDot(maya, 'Leo')).toHaveAttribute('data-count', '0');
  await Promise.all([maya, leo].map((p) => p.context().close()));
});

test('without hands, the deal dialog explains how to add one', async ({ page }) => {
  await enter(page, 'Maya');
  await page.getByRole('button', { name: /Card deck/ }).click();
  const deck = await page.locator('.mini-grid i[data-type="deck"]').evaluate((n) => ({ x: Number(n.getAttribute('data-x')), y: Number(n.getAttribute('data-y')) }));
  await page.locator('canvas').first().click({ position: { x: deck.x, y: deck.y + 62 } });
  await page.locator('.selection-bar').getByRole('button', { name: 'Deal…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Deal cards' });
  await expect(dialog).toContainText('no hands on the board'); await expect(dialog.getByRole('button', { name: 'Deal', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click(); await expect(dialog).toBeHidden();
});

test.describe('with motion', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });
  test('dealt cards fly out of the deck one after another and land in the hands', async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as { __manipadDrawBudgetMs: number }).__manipadDrawBudgetMs = Number.POSITIVE_INFINITY; });
    await enter(page, 'Maya');
    const bot = await joinAsBot(test.info().project.use.baseURL!, page.url().split('/room/')[1]);
    await page.getByRole('button', { name: /My hand/ }).click(); await expect(handDot(page, 'Maya')).toHaveCount(1);
    await bot.run({ type: 'create', object: playingDeck('deck', 640, 200) });
    await page.evaluate(() => { (window as unknown as { __manipadAnimations: string[] }).__manipadAnimations = []; });
    await bot.run({ type: 'dealCards', id: 'deck', count: 4 });
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __manipadAnimations?: string[] }).__manipadAnimations ?? [])).filter((e) => e.startsWith('draw:')).length).toBe(4);
    await expect(handDot(page, 'Maya')).toHaveAttribute('data-count', '4');
    // Every card ends inside the hand, where the board says it is.
    const cards = await page.locator('.mini-grid i[data-type="card"]').evaluateAll((nodes) => nodes.map((n) => ({ id: n.getAttribute('data-id')!, x: Number(n.getAttribute('data-x')), y: Number(n.getAttribute('data-y')) })));
    for (const card of cards) await expect.poll(() => page.evaluate((id) => { const node = (window as unknown as { Konva: { stages: { findOne: (s: string) => { x(): number; y(): number } }[] } }).Konva.stages[0].findOne(`#${id}`); return [Math.round(node.x()), Math.round(node.y())]; }, card.id)).toEqual([Math.round(card.x), Math.round(card.y)]);
    bot.close();
  });
});
