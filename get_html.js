const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/get_html_output.html', bodyHtml);
  await browser.close();
})();