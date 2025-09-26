const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const url = process.argv[2];

  const responses = [];

  try {
    page.on('response', async (response) => {
      const request = response.request();
      if (['xhr', 'fetch'].includes(request.resourceType())) {
        const url = response.url();
        let json = null;
        try {
            json = await response.json();
        } catch (e) {
            // not a json response
        }
        responses.push({url, json});
      }
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    await page.waitForTimeout(5000); // Wait for API calls to complete

    fs.writeFileSync('parser_output.json', JSON.stringify(responses, null, 2));
    console.log('All XHR/Fetch responses saved to parser_output.json');

  } catch (error) {
    console.error(`Error in parser:`, error);
  } finally {
    await browser.close();
  }
})();