const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as a command-line argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('get_html_output.html', bodyHtml, 'utf-8');
    console.log('HTML content saved to get_html_output.html');
  } catch (error) {
    console.error(`Error fetching page: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
