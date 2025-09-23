const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://www.dreamh.co.kr/front/medical/medical.php?medical=2', { waitUntil: 'networkidle' });
        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync('/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/services/crawling_bedoc/data/H31KR-23002084/temp_page.html', bodyHTML, 'utf-8');
        console.log('HTML content saved to temp_page.html');
    } catch (error) {
        console.error('Error fetching HTML:', error);
    } finally {
        await browser.close();
    }
})();