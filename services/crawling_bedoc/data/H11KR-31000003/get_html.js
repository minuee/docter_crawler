const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.cmcujb.or.kr/page/doctor/160/D0001104', { waitUntil: 'networkidle' });

        // Expand all collapsible sections on the page first
        const profileContainer = page.locator('.cont_main_profile');
        const profileMoreButtons = profileContainer.locator('.profile_view_more a');
        const buttonCount = await profileMoreButtons.count();
        console.log(`Found ${buttonCount} section expansion buttons.`);

        for (let i = 0; i < buttonCount; i++) {
            try {
                await profileMoreButtons.nth(i).click({ timeout: 1500 });
                console.log(`Clicked expansion button ${i + 1}.`);
                await page.waitForTimeout(500); // Wait for animation
            } catch(e){
                console.log(`Could not click expansion button ${i + 1}. It might have been covered or already expanded.`);
            }
        }

        // Now that sections are expanded, save the HTML
        console.log('All sections expanded. Saving HTML to debug_thesis_page.html');
        const html = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync('debug_thesis_page.html', html);
        console.log('Successfully saved HTML.');

    } catch (e) {
        console.error('An error occurred:', e.message);
    } finally {
        await browser.close();
    }
})();
