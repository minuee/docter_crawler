
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as an argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('get_html_output.html', bodyHtml);
    console.log('HTML content saved to get_html_output.html');
  } catch (e) {
    console.error(`Error fetching page: ${e.message}`);
  } finally {
    await browser.close();
  }
})();
