
const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
        const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, site_type } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let extractedHtml = null;
    let isAttend = false;
    let error = null;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const doctorName = doctorData.bedoc_doctorname;
        let doctorElement = await page.locator(`text=${doctorName}`).first();

        if (!await doctorElement.isVisible()) {
            error = `Doctor ${doctorName} not found on the page.`;
        } else {
            let clickTarget = doctorElement;

            const [popup] = await Promise.all([
                page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
                clickTarget.click()
            ]);

            let contentPage = page;
            if (popup) {
                contentPage = popup;
                await contentPage.waitForLoadState('networkidle', { timeout: 60000 });
            } else {
                await page.waitForSelector('.modal-content, .popup-container, #doctor-detail-modal', { state: 'visible', timeout: 10000 }).catch(() => null);
            }

            const rawHtml = await contentPage.content();
            const $ = cheerio.load(rawHtml);
            $('script, style, nav, header, footer, iframe, noscript').remove();
            extractedHtml = $('body').html();

            if (site_type === 'single') {
                isAttend = true; // Always true for single site type as per user instruction
            } else if (extractedHtml && extractedHtml.includes(doctorName)) {
                isAttend = true;
            }
        }

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    console.log(JSON.stringify({
        htmlContent: extractedHtml,
        isAttend: isAttend,
        error: error
    }));
})();
