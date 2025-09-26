const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, site_type, bedoc_hospitalsite } = doctorData; // Added bedoc_hospitalsite

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    let page = await context.newPage(); // Use 'let' because it might change for popups

    let extractedHtml = null;
    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        if (site_type === 'popup') {
            // Navigate to the main hospital site first
            await page.goto(bedoc_hospitalsite, { waitUntil: 'domcontentloaded', timeout: 120000 });

            // Try to find the doctor's name and click a related element to open the popup
            // This is a generic attempt. Real-world scenario needs specific selectors.
            // Assuming there's a link/button near the doctor's name that opens the popup
            const doctorElement = await page.$(`text=${bedoc_doctorname}`);
            if (doctorElement) {
                // Try to find a common "상세보기" (details) button or a link to click
                // This is highly speculative without knowing the actual HTML structure.
                // Common patterns: a sibling button, a parent's child link, or the doctorElement itself is clickable.
                let clickTarget = await doctorElement.$('xpath=./following-sibling::a[contains(text(), "상세보기")]') ||
                                  await doctorElement.$('xpath=./following-sibling::button[contains(text(), "상세보기")]') ||
                                  await doctorElement.$('xpath=./parent::*/a') || // Parent link
                                  await doctorElement.$('xpath=./parent::*/button') || // Parent button
                                  doctorElement; // Click the doctor's name itself

                if (clickTarget) {
                    // Listen for a new page (popup window) or a dialog (modal)
                    const [popup] = await Promise.all([
                        new Promise(resolve => context.once('page', resolve)), // Listen for new page
                        clickTarget.click()
                    ]);

                    if (popup) {
                        // It's a new window/tab
                        page = popup; // Switch context to the new page
                        await page.waitForLoadState('domcontentloaded');
                    } else {
                        // It's a modal/layer on the same page.
                        // Need to wait for the modal to appear. This is also speculative.
                        // For now, assume content is available on the current page after click.
                        // A more robust solution would wait for a specific modal selector.
                    }
                } else {
                    throw new Error(`Could not find a clickable element for doctor ${bedoc_doctorname}`);
                }
            } else {
                throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
            }

        } else { // site_type is 'single' or 'list' (handled by direct goto)
            await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });
        }

        const rawHtml = await page.content(); // Get content from the current page (could be popup)
        const $ = cheerio.load(rawHtml);

        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic (same as before) ---
        // Helper function to extract list items with date and content
        const extractListItems = ($, selector) => {
            const items = [];
            $(selector).each((i, el) => {
                const text = $(el).text().trim();
                const match = text.match(/^(\d{4}(?: ~ \d{4})?|\d{4}\.\d{2}\.\d{2})?\s*(.*)$/);
                if (match) {
                    items.push({
                        date: match[1] || null,
                        content: match[2].replace(/"/g, '')
                    });
                } else {
                    items.push({ date: null, content: text.replace(/"/g, '') });
                }
            });
            return items;
        };

        // Helper function to extract simple list of strings
        const extractSimpleList = ($, selector) => {
            const items = [];
            $(selector).each((i, el) => {
                items.push($(el).text().trim().replace(/"/g, ''));
            });
            return items;
        };

        // Extract Profile URL
        const profileImgSrc = $('.profile .photo img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
        }

        // Extract Specialty
        parsedDetails.specialty = $('.info p').first().text().trim();

        // Extract 학력 (Education)
        parsedDetails.학력 = extractListItems($, '#tab-info01 .list li');

        // Extract 경력 (Experience)
        parsedDetails.경력 = extractListItems($, '#tab-info01 .list li');

        // Extract 수상 (Awards)
        parsedDetails.수상 = extractListItems($, '#tab-info01 .list li');

        // Extract 학술 (Academic Activities)
        parsedDetails.학술 = extractListItems($, '#tab-info01 .list li');

        // Extract 언론 (Media Coverage)
        const mediaItems = [];
        $('#pressList li').each((i, el) => {
            const link = $(el).find('a');
            const text = link.text().trim();
            const url = link.attr('href');
            const date = $(el).find('span').text().trim();
            mediaItems.push({
                targetDate: date || null,
                type: null,
                text: text.replace(/"/g, ''),
                url: url || null,
                issuer: null
            });
        });
        parsedDetails.언론 = mediaItems;

        // Extract 저서 (Books)
        parsedDetails.저서 = extractSimpleList($, '#tab-info02 .list li');

        // Extract 논문 (Theses/Papers)
        parsedDetails.논문 = extractSimpleList($, '#tab-info02 .list li');
        // --- End of detailed parsing logic ---

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