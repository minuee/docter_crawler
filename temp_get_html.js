const { chromium } = require('playwright');

(async () => {
  const url = 'https://endolee.medisay.co.kr/build/endolee/menu-specialist_c322ba34-0024-4ad0-b59f-68ef04a9f33d.html';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log(bodyHtml);
  } catch (e) {
    console.error(`Error fetching page content for ${url}: ${e.message}`);
  } finally {
    await browser.close();
  }
})();