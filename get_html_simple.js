
const { chromium } = require('playwright');
const fs = require('fs');

async function getPageContent(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000); // Allow time for dynamic content
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('get_html_output.html', bodyHtml);
  await browser.close();
  console.log('HTML content saved to get_html_output.html');
}

const url = process.argv[2];
if (!url) {
  console.error('Please provide a URL.');
  process.exit(1);
}

getPageContent(url);
