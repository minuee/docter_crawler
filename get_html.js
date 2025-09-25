const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto("https://www.vievisnamuh.com/user/hpm/smt/SMTPage.do", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Wait for any dynamic content to load
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('get_html_output.html', bodyHtml);
    console.log('HTML content saved to get_html_output.html');
  } catch (error) {
    console.error('Error fetching HTML:', error);
  } finally {
    await browser.close();
  }
})();