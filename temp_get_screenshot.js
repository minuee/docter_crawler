
const { chromium } = require('playwright');
const fs = require('fs');

const url = 'https://hormone-doctor.imweb.me/introduction';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'hasseungwoo_profile.png', fullPage: true });
    console.log('Screenshot saved as hasseungwoo_profile.png');

  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    await browser.close();
  }
})();
