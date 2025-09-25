
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  const doctorName = process.argv[3];

  if (!url || !doctorName) {
    console.error('Please provide a URL and a doctor name as command-line arguments.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const linkLocator = page.getByRole('link', { name: new RegExp(doctorName) });
    await linkLocator.first().click();

    // Wait for a unique element inside the popup to ensure it has loaded
    const detailContainerLocator = page.locator('.doc_Data').first();
    await detailContainerLocator.waitFor({ state: 'visible', timeout: 10000 });

    const html = await detailContainerLocator.innerHTML();
    console.log(html);

  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
