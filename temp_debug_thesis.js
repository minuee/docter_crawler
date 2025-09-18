
const { chromium } = require('playwright');

(async () => {
    const url = 'https://www.schmc.ac.kr/cheonan/doctr/home.do?key=2945&doctrNo=942';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        
        const moreButton = page.locator('a.thesisBtn');
        if (await moreButton.count() > 0 && await moreButton.isVisible()) {
            console.log("--- Clicking 'More' button ---");
            await moreButton.click();
            await page.waitForTimeout(2000); // Wait for content to load
            const thesisHTML = await page.innerHTML('ul#_thesisContainer');
            console.log("--- HTML after click ---");
            console.log(thesisHTML);
        } else {
            console.log("--- 'More' button not found or not visible ---");
            const thesisHTML = await page.innerHTML('ul#_thesisContainer');
            console.log("--- HTML without click ---");
            console.log(thesisHTML);
        }

    } catch (e) {
        console.error('Error during debug script:', e.message);
    } finally {
        await browser.close();
    }
})();
