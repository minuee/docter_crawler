const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('https://www.rch.or.kr/web/rchseoul/contents/C01', { waitUntil: 'networkidle' });
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/temp_rch.html', bodyHTML);
    console.log('HTML content saved to temp_rch.html');
  } catch (error) {
    console.error('Error fetching page:', error);
  } finally {
    await browser.close();
  }
})();