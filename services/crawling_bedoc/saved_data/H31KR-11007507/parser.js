
const { chromium } = require('playwright');

// This script is designed to be executed by a shell command.
// It accepts three command-line arguments:
// 1. The URL of the doctor list page.
// 2. The name of the doctor to find.
// 3. The department name of the doctor.
const url = process.argv[2];
const doctorName = process.argv[3];
// const deptName = process.argv[4]; // deptName might be useful for more complex lists

if (!url || !doctorName) {
  console.error('Usage: node parser.js <url> <doctorName>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    // Strategy for 'list' site_type:
    // 1. Find an element that contains the doctor's name.
    // This uses a text selector, which is robust.
    const doctorElementLocator = page.locator(`*:has-text("'''${doctorName}'''")`);

    // 2. From within that element, find the clickable link/button.
    // Common patterns are `<a>` tags or elements with a role of 'button' or 'link'.
    // We'll try to find a link that seems to be for details.
    // This might need adjustment per site. A common name is "상세보기" or the doctor's name itself is the link.
    const detailLinkLocator = doctorElementLocator.locator('a:has-text("프로필 보기"), a:has-text("상세보기"), a:has-text("자세히 보기")').first();

    let clicked = false;
    try {
        // First, try to click a specific "details" link.
        await detailLinkLocator.click({ timeout: 5000 });
        clicked = true;
    } catch (e) {
        // If that fails, it's possible the element with the name is itself the link.
        // Let's try clicking the main element found.
        try {
            await doctorElementLocator.first().click({ timeout: 5000 });
            clicked = true;
        } catch (e2) {
            // If both fail, we log the error and proceed, maybe the initial page is the detail page.
            console.error(`Could not find or click a specific detail link for ${doctorName}. The current page content will be returned.`);
        }
    }

    // If a click happened, wait for the navigation/popup to complete.
    if (clicked) {
        await page.waitForLoadState('networkidle');
    }

    // Return the full HTML of the final page.
    const finalHtml = await page.content();
    console.log(finalHtml);

  } catch (error) {
    console.error(`An error occurred during Playwright execution: ${error}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
