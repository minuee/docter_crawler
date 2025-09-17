
const { chromium } = require('playwright');

(async () => {
    const url = 'https://www.brmh.org/custom/popup/layer_doctor_view.do?dt_no=275&medi_code=001027000|001027000';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle' });

        // Click the '연구업적' tab
        await page.click('li#box_tab3 a');
        
        // Wait for the AJAX response that loads the content for this tab
        await page.waitForResponse(resp => resp.url().includes('/clinic/doctor/bris.do'), { timeout: 10000 });

        // A small extra wait for any client-side rendering
        await page.waitForTimeout(1000);

        // Get the HTML of the content area
        const contentAreaHtml = await page.$eval('#box_area3', el => el.outerHTML);
        
        console.log("--- '연구업적' Tab Content HTML ---");
        console.log(contentAreaHtml);

    } catch (e) {
        console.error('Error during debug script execution:', e.stack);
    } finally {
        await browser.close();
    }
})();
