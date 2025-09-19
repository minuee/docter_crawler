const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('https://kangnam.hallym.or.kr/ptm207.asp?Doctor_Id=298', { waitUntil: 'networkidle' });
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log(bodyHTML);
  } catch (error) {
    console.error('Error fetching page:', error);
  } finally {
    await browser.close();
  }
})();