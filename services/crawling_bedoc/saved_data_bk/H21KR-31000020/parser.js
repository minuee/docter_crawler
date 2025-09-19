const { chromium } = require('playwright');

const [,, url, doctorName] = process.argv;

if (!url || !doctorName) {
  console.error('Error: URL and doctorName arguments are missing.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const doctorBlock = page.locator('.drbox', { hasText: doctorName });
    
    // As per user, only the specialty from the list view is available.
    const specialty = await doctorBlock.locator('.t2').textContent();

    const extractedData = {
      specialty: specialty ? specialty.trim() : null,
      // Other fields are not available on this page
      학력: [],
      경력: [],
      논문: []
    };

    console.log(JSON.stringify(extractedData, null, 2));

  } catch (error) {
    console.error(`Error during playwright execution: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();