
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
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        if (site_type === 'single') {
            extractedHtml = await page.content();
        } else if (site_type === 'list') {
            // Logic for list type
            const doctorLocator = page.locator(`text=${bedoc_doctorname}`).first();
            if (!await doctorLocator.isVisible()) {
                throw new Error(`Doctor ${bedoc_doctorname} not found in the list.`);
            }
            const detailLink = doctorLocator.locator('xpath=ancestor::div[contains(@class, "doctor-item")]//a[contains(@href, "view") or contains(@href, "detail")]').first();
            if (await detailLink.isVisible()) {
                await detailLink.click();
                await page.waitForLoadState('networkidle', { timeout: 60000 });
                extractedHtml = await page.content();
            } else {
                await doctorLocator.click();
                await page.waitForLoadState('networkidle', { timeout: 60000 });
                extractedHtml = await page.content();
            }
        } else if (site_type === 'popup') {
            // Logic for popup type
            const doctorLocator = page.locator(`text=${bedoc_doctorname}`).first();
            if (!await doctorLocator.isVisible()) {
                throw new Error(`Doctor ${bedoc_doctorname} not found to trigger popup.`);
            }
            const popupTrigger = doctorLocator.locator('xpath=ancestor::div[contains(@class, "doctor-item")]//button[contains(text(), "상세보기")] | xpath=ancestor::div[contains(@class, "doctor-item")]//a[contains(text(), "상세보기")]').first();
            
            let clickTarget = popupTrigger;
            if (!await clickTarget.isVisible()) {
                clickTarget = doctorLocator;
            }

            const [popup] = await Promise.all([
                page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
                clickTarget.click()
            ]);

            let contentPage = page;
            if (popup) {
                contentPage = popup;
                await contentPage.waitForLoadState('networkidle', { timeout: 60000 });
                extractedHtml = await contentPage.content();
            } else {
                await page.waitForSelector('.modal-content, .popup-container, #doctor-detail-modal', { state: 'visible', timeout: 10000 });
                extractedHtml = await page.content();
            }
        } else {
            error = `Unsupported site_type: ${site_type}`;
        }

        if (extractedHtml) {
            const $ = cheerio.load(extractedHtml);
            $('script, style, nav, header, footer, iframe, noscript').remove();
            extractedHtml = $('body').html();

            if (site_type === 'single') {
                isAttend = true; // Always true for single site type as per user instruction
            } else if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
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
