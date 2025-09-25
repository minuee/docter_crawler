const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('http://www.madisesang.com/views/doctors.php', { waitUntil: 'networkidle' });
        const doctorListItem = page.locator('ul.intro_doctors_list > li', { has: page.locator(`h5:has-text("박정관")`) });
        await doctorListItem.locator('.btn_more_doctors').click();
        await page.waitForTimeout(2000); // Wait for popup to initialize
        const html = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync('debug_page.html', html);
        console.log('HTML content saved to debug_page.html');
    } catch (e) {
        console.error(e.message);
    } finally {
        await browser.close();
    }
})();
