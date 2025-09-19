const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const url = 'http://yubang.kr/?page_id=1386';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/temp_yubang_body.html', bodyHtml);
    await browser.close();
    console.log('HTML saved to temp_yubang_body.html');
})();