const { chromium } = require('playwright');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('URL required');
        process.exit(1);
    }

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const imageUrl = await page.evaluate(() => {
            const imageElement = document.querySelector('.s_cont_1 img');
            if (imageElement) {
                return imageElement.src;
            }
            return null;
        });

        if (imageUrl) {
            console.log(imageUrl);
        } else {
            console.error('Could not find a relevant image URL on the page.');
        }

    } catch (e) {
        console.error(`Error: ${e.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
