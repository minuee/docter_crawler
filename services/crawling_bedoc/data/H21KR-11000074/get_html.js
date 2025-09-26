
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as an argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Emulate a common user agent to avoid blocking
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    // Use page.evaluate to get only the body's innerHTML
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    // Write to a file to be read by the next step
    fs.writeFileSync('debug_page.html', bodyHtml, 'utf-8');
    console.log('HTML content saved to debug_page.html');
  } catch (error) {
    console.error(`Error fetching page: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
