
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// This script is designed to be executed by a shell command.
// It accepts three command-line arguments:
// 1. The URL of the doctor list page.
// 2. The name of the doctor to find.
// 3. The department name of the doctor (optional).
const url = process.argv[2];
const doctorName = process.argv[3];

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
    const doctorElementLocator = page.locator(`*:has-text("${doctorName}")`).last();

    // 2. From within that element, find the clickable link/button.
    // Common patterns are `<a>` tags or elements with a role of 'button' or 'link'.
    // We look for a link that seems to be for details.
    const detailLinkLocator = doctorElementLocator.locator('a:has-text("자세히보기"), a:has-text("상세보기"), a:has-text("의료진소개")').first();

    let clicked = false;
    try {
        await detailLinkLocator.click({ timeout: 5000 });
        clicked = true;
    } catch (e) {
        try {
            await doctorElementLocator.click({ timeout: 5000 });
            clicked = true;
        } catch (e2) {
            console.error(`Could not find or click a specific detail link for ${doctorName}. The current page content will be returned.`);
        }
    }

    if (clicked) {
        await page.waitForLoadState('networkidle');
    }

    // Sanitize and return the HTML of the final page.
    const finalHtml = await page.content();
    
    // Basic sanitization: remove script and style tags
    const sanitizedHtml = finalHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                   .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    console.log(sanitizedHtml);

  } catch (error) {
    console.error(`An error occurred during Playwright execution: ${error}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
