const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://footandankle.co.kr/index.php/html/11', { waitUntil: 'domcontentloaded' });
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log(bodyHTML);
  await browser.close();
})();
