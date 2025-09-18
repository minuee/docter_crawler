const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://seoul.barunsesang.co.kr/index.php?idx=c5d12fb453a5eb/c5d143e0c586f7#view=5d5274a9e2484', { waitUntil: 'networkidle' });
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('temp_barunsesang_body.html', bodyHtml);
  await browser.close();
})();