const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const url = 'http://www.parkside.co.kr/sub/sub0201.php';
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log(bodyHTML);
  } catch (error) {
    console.error('Error fetching page:', error);
  } finally {
    await browser.close();
  }
})();