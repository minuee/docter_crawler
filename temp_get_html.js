const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('https://limsk-endo.co.kr/19', { waitUntil: 'networkidle' });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log(bodyHtml);
  } catch (e) {
    console.error('Error fetching HTML:', e.message);
  } finally {
    await browser.close();
  }
})();