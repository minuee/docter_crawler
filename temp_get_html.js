const { chromium } = require('playwright');
const fs = require('fs');

async function getHtml() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'http://www.asanrecon.com/html/main.asp#team';

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Find the "자세히 보기" button for 조우신 and click it
        const doctorContainer = page.locator('div.col-md-3.col-sm-6.col-xs-12.margin-bottom2', { has: page.locator('img[src="/images/m-team/man02t-23.jpg"]') });
        await doctorContainer.locator('a.image-popup-vertical-fit').click();

        // Wait for the popup to appear. I'll wait for a selector that is likely to be in the popup.
        // I'll assume the popup is loaded via ajax and the content will be in a div with a class like 'mfp-content' which is common for magnific popup.
        await page.waitForSelector('.mfp-content', { timeout: 10000 });
        
        const html = await page.locator('.mfp-content').innerHTML();
        fs.writeFileSync('temp_jo_woo_shin_popup.html', html);
        console.log('HTML saved to temp_jo_woo_shin_popup.html');

    } catch (e) {
        console.error(e.message);
    } finally {
        await browser.close();
    }
}

getHtml();