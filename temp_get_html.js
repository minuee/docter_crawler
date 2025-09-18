const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('https://dongtan.hallym.or.kr/ptm207.asp?Doctor_Id=1248', { waitUntil: 'networkidle' });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log(bodyHtml);
  } catch (e) {
    console.error('Error fetching HTML:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
