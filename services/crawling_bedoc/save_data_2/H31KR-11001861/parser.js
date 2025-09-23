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
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 90000 });

        const doctorName = doctorData.bedoc_doctorname;
        let contentPage = page; // For single type, content is on the main page

        const rawHtml = await contentPage.content();
        console.log(rawHtml); // Log raw HTML for debugging
        const $ = cheerio.load(rawHtml);
        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(doctorName)) {
            isAttend = true;
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