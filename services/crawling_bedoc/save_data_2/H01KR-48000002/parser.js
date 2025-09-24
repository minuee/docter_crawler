const { chromium } = require('playwright');

(async () => {
    console.log("--- Minimal parser starting ---");
    const hospitalSite = process.argv[2];
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(hospitalSite, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const title = await page.title();
        console.log(JSON.stringify({ success: true, title: title }, null, 2));
    } catch (e) {
        console.error("--- ERROR ---");
        console.error(e.stack);
        console.log(JSON.stringify({ success: false, error: e.message }, null, 2));
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();