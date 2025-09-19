const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('https://ntrh.or.kr/index.php/html/11', { waitUntil: 'domcontentloaded' });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('temp_ntrh_list.html', bodyHtml);
    console.log('Successfully fetched and saved body HTML to temp_ntrh_list.html');
  } catch (error) {
    console.error('Error fetching page:', error);
  } finally {
    await browser.close();
  }
})();