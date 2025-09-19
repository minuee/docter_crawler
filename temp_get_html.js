
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log(bodyHTML);
  } catch (error) {
    console.error(`Error fetching page: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
