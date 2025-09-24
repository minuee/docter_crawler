const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('get_html_output.html', bodyHtml);
  await browser.close();
})();