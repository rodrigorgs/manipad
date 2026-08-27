import { test, expect } from '@playwright/test';

test('creates a room and exposes the collaborative board',async({page})=>{
  await page.goto('/'); await expect(page.getByRole('heading',{name:/Explain it/i})).toBeVisible();
  await page.getByRole('button',{name:/Start a new room/i}).click(); await expect(page).toHaveURL(/\/room\//);
  await page.getByLabel('Your name').fill('Tutor'); await page.getByRole('button',{name:/Enter room/i}).click();
  await expect(page.getByText('Things to move')).toBeVisible(); await expect(page.getByText('Live')).toBeVisible();
  await page.getByRole('button',{name:/Counter/}).click(); await page.getByRole('button',{name:/Counter/}).click(); await page.getByRole('button',{name:/Die/}).click();
  const canvas=page.locator('canvas').first();await expect(canvas).toBeVisible();await expect(page.locator('.mini-grid i')).toHaveCount(3);
  const dots=await page.locator('.mini-grid i').evaluateAll(nodes=>nodes.map(node=>`${node.getAttribute('data-x')},${node.getAttribute('data-y')}`));expect(new Set(dots).size).toBeGreaterThan(1);
  await page.getByRole('button',{name:/Two-sided chip/}).dragTo(canvas,{targetPosition:{x:320,y:240}});await expect(page.locator('.mini-grid i')).toHaveCount(4);
  await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=30;canvas.height=20;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#e85c62';ctx.fillRect(0,0,30,20);canvas.toBlob(blob=>{const transfer=new DataTransfer();transfer.items.add(new File([blob!],'pasted.png',{type:'image/png'}));const event=new Event('paste',{bubbles:true});Object.defineProperty(event,'clipboardData',{value:transfer});document.body.dispatchEvent(event);},'image/png');});
  await expect(page.locator('.mini-grid i')).toHaveCount(5);
});

test('two clients join the same room and synchronize presence',async({browser})=>{
  const tutor=await browser.newContext(),student=await browser.newContext();const a=await tutor.newPage(),b=await student.newPage();
  await a.goto('/');await a.getByRole('button',{name:/Start a new room/i}).click();await a.waitForURL(/\/room\//);const url=a.url();await a.getByLabel('Your name').fill('Maya');await a.getByRole('button',{name:/Enter room/i}).click();
  await b.goto(url);await b.getByLabel('Your name').fill('Leo');await b.getByRole('button',{name:/Enter room/i}).click();
  await expect(a.locator('[title^="Leo"]')).toBeVisible();await expect(b.locator('[title^="Maya"]')).toBeVisible();await tutor.close();await student.close();
});
