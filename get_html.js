const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument.');
        process.exit(1);
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('get_html_output.html', bodyHtml);
    await browser.close();
    console.log('HTML content saved to get_html_output.html');
})();