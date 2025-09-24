const { chromium } = require('playwright');
const fs = require('fs');

async function getPageHTML(url) {
    if (!url) {
        console.error("Please provide a URL.");
        process.exit(1);
    }
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const html = await page.content();
        console.log(html);
    } catch (e) {
        console.error(`Playwright execution failed: ${e.message}`);
    } finally {
        if (browser) { await browser.close(); }
    }
}

const targetUrl = process.argv[2];
getPageHTML(targetUrl);
