
const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    const url = 'https://boazent.co.kr/pages/11'; // URL for 박문서 list page
    const outputHtmlPath = path.join(__dirname, 'temp_boazent_page11_html.html');

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const htmlContent = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync(outputHtmlPath, htmlContent);
        console.log(`Full HTML saved to ${outputHtmlPath}`);

    } catch (error) {
        console.error('Error during Playwright HTML extraction process:', error);
    } finally {
        await browser.close();
    }
})();
