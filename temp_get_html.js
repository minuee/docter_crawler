const { chromium } = require('playwright');

(async () => {
    const url = process.argv[2];
    const doctorName = process.argv[3];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        
        const doctorContainer = page.locator(`.prd_list:has-text("${doctorName}")`);
        const paperButton = doctorContainer.locator('a:has-text("논문보기")');
        
        if (await paperButton.count() > 0) {
            await paperButton.click();
            await page.waitForTimeout(3000); 
        }

        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        console.log(bodyHtml);

    } catch (e) {
        console.error(`Error fetching HTML: ${e.message}`);
    } finally {
        await browser.close();
    }
})();