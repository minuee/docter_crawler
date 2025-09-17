
const { chromium } = require('playwright');

(async () => {
    const url = 'https://www.brmh.org/custom/popup/layer_doctor_view.do?dt_no=275&medi_code=001027000|001027000';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle' });

        // Click the media tab
        await page.click('li#box_tab4 a');
        await page.waitForTimeout(2000); // Wait for AJAX

        // Get the HTML of the pagination control for the media tab
        const paginationHtml = await page.$eval('div#pageLinkList', el => el.outerHTML);
        
        console.log("--- Media Tab Pagination HTML ---");
        console.log(paginationHtml);

    } catch (e) {
        console.error('Error during debug script execution:', e);
    } finally {
        await browser.close();
    }
})();
