const { chromium } = require('playwright');

(async () => {
    const url = process.argv[2]; // Get URL from command line argument
    if (!url) {
        console.error('Usage: node playwright_fetch_content.js <URL>');
        process.exit(1);
    }

    const browser = await chromium.launch();
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });

        // Loop to click "More" buttons for pagination
        while (true) {
            const moreButton = page.locator('a:text("더보기"), button:text("더보기"), a:text("more"), button:text("more")').first();
            const isVisible = await moreButton.isVisible().catch(() => false);
            if (isVisible) {
                await moreButton.click({force: true}).catch(() => {}); // Use force click to handle potential overlays
                // Wait a bit for content to load after click. Adjust time if necessary.
                await page.waitForTimeout(1500); 
            } else {
                break; // Exit loop if no more "More" button is visible
            }
        }

        const sanitizedContent = await page.evaluate(() => {
            const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, iframe, noscript');
            elementsToRemove.forEach(el => el.remove());
            return document.body.innerHTML;
        });
        console.log(sanitizedContent);
    } catch (error) {
        console.error(`Error fetching content from ${url}:`, error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();