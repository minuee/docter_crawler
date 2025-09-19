const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as an argument.');
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Get the FULL HTML content for debugging selectors
    const fullHtml = await page.content();

    console.log(fullHtml);

  } catch (error) {
    console.error(`Error fetching HTML: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();