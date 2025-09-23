
const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, site_type, bedoc_hospitalsite } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    let page = await context.newPage();

    let extractedHtml = null;
    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        // Extract profileUrl from the main page before popup
        const mainPageHtml = await page.content();
        const $main = cheerio.load(mainPageHtml);
        const profileImgSrc = $main('li.img img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        // --- Start of "더보기" button handling (generic) ---
        const clickMoreButtons = async (currentPage) => {
            const maxClicks = 10; // Limit to prevent infinite loops
            let clickedCount = 0;
            let buttonFound = true;

            while (buttonFound && clickedCount < maxClicks) {
                buttonFound = false;
                const moreButton = await currentPage.$('button:has-text("더보기")') ||
                                   await currentPage.$('a:has-text("더보기")') ||
                                   await currentPage.$('button:has-text("더보기 +")') ||
                                   await currentPage.$('a:has-text("더보기 +")');

                if (moreButton) {
                    try {
                        await moreButton.click();
                        await currentPage.waitForTimeout(1000); // Wait for content to load
                        clickedCount++;
                        buttonFound = true;
                    } catch (clickError) {
                        console.log(`Could not click more button: ${clickError.message}`);
                        buttonFound = false;
                    }
                }
            }
        };
        // --- End of "더보기" button handling ---

        if (site_type === 'popup') {
            // Find the doctor's element and click the detail button
            const doctorElement = await page.$(`text=${bedoc_doctorname}`);
            if (doctorElement) {
                console.log(`Doctor element found for ${bedoc_doctorname}`);
                // Look for a common detail button near the doctor's name
                const detailButton = await doctorElement.$('xpath=./preceding-sibling::li[@class="dr_link" and contains(text(), "자세히보기 +")]');

                if (detailButton) {
                    console.log(`Detail button found for ${bedoc_doctorname}. Attempting click.`);
                    await detailButton.click(); // Just click, don't wait for new page yet

                    let isNewPage = false;
                    try {
                        const newPage = await context.waitForEvent('page', { timeout: 5000 }); // Shorter timeout for new page
                        page = newPage; // Switch context to the new page
                        await page.waitForLoadState('domcontentloaded');
                        isNewPage = true;
                    } catch (e) {
                        console.log("No new page opened, assuming modal/layer.");
                        // No new page, so it's a modal/layer on the same page
                        // Wait for a common modal selector to appear
                        await page.waitForSelector('div[id*="view"], div[class*="view"]', { state: 'visible', timeout: 30000 });
                        // The page context remains the same, so no need to reassign 'page'
                    }

                    await clickMoreButtons(page); // Click more buttons on the current page (either new page or main page with modal)
                } else {
                    // If no new page, assume it's a modal/layer on the same page
                    // Wait for a common modal selector to appear
                    await page.waitForSelector('div[id*="modal"], div[class*="modal"]', { state: 'visible', timeout: 30000 });
                    await clickMoreButtons(page); // Click more buttons on the main page (with modal)
                }
            } else {
                throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
            }
        } else { // site_type is 'single' or 'list' (handled by direct goto)
            await clickMoreButtons(page); // Click more buttons on the main page
        }

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        // Sanitize HTML (remove scripts, styles, etc.)
        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic for Seran Hospital ---

        // Extract Specialty
        parsedDetails.specialty = $('.clinic .c_con').text().trim();

        // Extract 약력 (Education and Career)
        const historyText = $('ul.contents li.con').html();
        if (historyText) {
            const items = historyText.split('<br>').map(item => item.trim()).filter(item => item !== '');
            // Assuming the first few items are 학력 and the rest are 경력. This might need refinement.
            // For now, put all into 경력 as it's a mix of both.
            parsedDetails.경력 = items.map(content => ({ date: null, content: content.replace(/"/g, '' ) }));
        }

        // Extract 학회 (Academic Societies)
        const academicText = $('ul.contents2 li.con').html();
        if (academicText) {
            const items = academicText.split('<br>').map(item => item.trim()).filter(item => item !== '');
            parsedDetails.학술 = items.map(content => ({ date: null, content: content.replace(/"/g, '' ) }));
        }

        // Extract 논문 (Papers) / 연수 및 학술활동 (Training & Academic Activities)
        const paperText = $('ul.contents3 li.con').html();
        if (paperText) {
            const items = paperText.split('<br>').map(item => item.trim()).filter(item => item !== '');
            parsedDetails.논문 = items.map(content => content.replace(/"/g, '' ));
        }

        // Initialize other fields as empty arrays if not found
        if (!parsedDetails.학력) parsedDetails.학력 = [];
        if (!parsedDetails.경력) parsedDetails.경력 = [];
        if (!parsedDetails.논문) parsedDetails.논문 = [];
        if (!parsedDetails.언론) parsedDetails.언론 = [];
        if (!parsedDetails.저서) parsedDetails.저서 = [];
        if (!parsedDetails.수상) parsedDetails.수상 = [];
        if (!parsedDetails.학술) parsedDetails.학술 = [];

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
        error: error,
        ...parsedDetails
    }));
})();
