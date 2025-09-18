const { chromium } = require('playwright');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error("Please provide a URL as an argument.");
        process.exit(1);
    }
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        console.log(bodyHtml);
    } catch (e) {
        console.error(`Error fetching HTML: ${e.message}`);
    } finally {
        await browser.close();
    }
})();