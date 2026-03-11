import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  await page.goto('https://blocwrite.com', { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait for page to fully render
  await new Promise(r => setTimeout(r, 3000));

  // 1. Hero section - top of page
  await page.screenshot({ path: 'screenshot-1-hero.png', fullPage: false });
  console.log('1. Hero section captured');

  // Scroll down and capture each section
  // 2. The Architect section
  const plotSpine = await page.$('text/THE ARCHITECT') || await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const el = els.find(e => e.textContent?.includes('THE ARCHITECT') && e.textContent?.includes('Map your entire story'));
    if (el) {
      el.scrollIntoView({ block: 'start' });
      return true;
    }
    return false;
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot-2-architect.png', fullPage: false });
  console.log('2. The Architect section captured');

  // 3. Canon section
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const el = els.find(e => e.textContent?.includes('THE CANON') && e.offsetHeight > 0 && e.offsetHeight < 100);
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot-3-canon.png', fullPage: false });
  console.log('3. Canon section captured');

  // 4. Scene-by-scene (Blocs) section
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const el = els.find(e => e.textContent?.includes('SCENE-BY-SCENE') && e.offsetHeight > 0 && e.offsetHeight < 100);
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot-4-blocs.png', fullPage: false });
  console.log('4. Blocs section captured');

  // 5. Non-Fiction section
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const el = els.find(e => e.textContent?.includes('NON-FICTION') && e.offsetHeight > 0 && e.offsetHeight < 100);
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot-5-nonfiction.png', fullPage: false });
  console.log('5. Non-Fiction section captured');

  // Also capture the full page for reference
  await page.screenshot({ path: 'screenshot-full-page.png', fullPage: true });
  console.log('Full page captured');

  await browser.close();
  console.log('Done!');
})();
