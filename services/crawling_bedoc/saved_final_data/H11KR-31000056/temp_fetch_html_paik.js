const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.paik.ac.kr/ilsan/user/doctor/view.do?doctorId=691', { waitUntil: 'networkidle', timeout: 60000 });
        const htmlContent = await page.content();
        console.log(htmlContent);
    } catch (e) {
        console.error("Error fetching HTML:", e.message);
    } finally {
        await browser.close();
    }
})();