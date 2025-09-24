
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Usage: node debug_script.js <URL>');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        console.log('Hovering over doctor element...');
        const doctorElement = page.locator('ul.doctors li', { has: page.locator('p:has-text("김성재")') });
        await doctorElement.hover();

        console.log('Clicking details button...');
        const hoverElement = doctorElement.locator('.hover');
        await hoverElement.click();

        // Wait for AJAX to complete
        console.log('Waiting for content to load...');
        await page.waitForTimeout(3000);

        console.log('Taking screenshot to debug_screenshot.png...');
        await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });

        console.log('Saving page HTML to debug_page.html...');
        const html = await page.content();
        fs.writeFileSync('debug_page.html', html);

        console.log('Debugging files have been saved.');

    } catch (e) {
        console.error(`An error occurred during debugging: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
