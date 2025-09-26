
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as an argument.');
    process.exit(1);
  }

  console.log(`Navigating to ${url}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Page loaded. Waiting for 20 seconds...');
    await page.waitForTimeout(20000); // Wait for 20 seconds for dynamic content

    console.log('Getting page content...');
    const pageContent = await page.content();
    fs.writeFileSync('debug_page.html', pageContent);
    console.log('Full page HTML saved to debug_page.html');

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'debug_screenshot.png' });
    console.log('Screenshot saved to debug_screenshot.png');

  } catch (e) {
    console.error('Error during processing:', e.message);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
