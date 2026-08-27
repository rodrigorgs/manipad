import { test, expect } from '@playwright/test';

test('creates a room and exposes the collaborative board',async({page})=>{
  await page.goto('/'); await expect(page.getByRole('heading',{name:/Explain it/i})).toBeVisible();
  await page.getByRole('button',{name:/Start a new room/i}).click(); await expect(page).toHaveURL(/\/room\//);
  await page.getByLabel('Your name').fill('Tutor'); await page.getByRole('button',{name:/Enter room/i}).click();
  await expect(page.getByText('Things to move')).toBeVisible(); await expect(page.getByText('Live')).toBeVisible();
  await page.getByRole('button',{name:'Counter'}).click(); await page.getByRole('button',{name:'Die'}).click();
  await expect(page.locator('canvas')).toBeVisible();
});

test('two clients join the same room and synchronize presence',async({browser})=>{
  const tutor=await browser.newContext(),student=await browser.newContext();const a=await tutor.newPage(),b=await student.newPage();
  await a.goto('/');await a.getByRole('button',{name:/Start a new room/i}).click();await a.waitForURL(/\/room\//);const url=a.url();await a.getByLabel('Your name').fill('Maya');await a.getByRole('button',{name:/Enter room/i}).click();
  await b.goto(url);await b.getByLabel('Your name').fill('Leo');await b.getByRole('button',{name:/Enter room/i}).click();
  await expect(a.locator('[title^="Leo"]')).toBeVisible();await expect(b.locator('[title^="Maya"]')).toBeVisible();await tutor.close();await student.close();
});
