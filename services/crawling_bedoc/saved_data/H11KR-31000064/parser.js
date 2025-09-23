const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, site_type, bedoc_hospitalsite } = doctorData;

    // Helper function to extract list items with date and content (modified for <br> separated content)
    const extractListItemsFromBr = (text) => {
        return text.split('<br>').map(item => {
            const trimmedItem = item.trim();
            if (trimmedItem) {
                // Attempt to parse date and content. This is a generic approach.
                // Real-world parsing would need more specific selectors/regex.
                const match = trimmedItem.match(/^(\d{4}(?: ~ \d{4})?|\d{4}\.\d{2}\.\d{2})?\s*(.*)$/);
                if (match) {
                    return {
                        date: match[1] || null,
                        content: match[2].replace(/"/g, '')
                    };
                } else {
                    return { date: null, content: trimmedItem.replace(/"/g, '') };
                }
            }
            return null;
        }).filter(item => item !== null);
    };

    // Helper function to extract simple list of strings (modified for <br> separated content)
    const extractSimpleListFromBr = (text) => {
        return text.split('<br>').map(item => item.trim().replace(/"/g, '')).filter(item => item !== '');
    };

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        // Set a custom User-Agent string
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' // Updated User-Agent
    });
    let page = await context.newPage();

    let extractedHtml = null;
    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        // Removed the delay before navigating

        if (site_type === 'popup') {
            await page.goto(bedoc_hospitalsite, { waitUntil: 'domcontentloaded', timeout: 120000 });

            const doctorElement = await page.$(`text=${bedoc_doctorname}`);
            if (doctorElement) {
                let clickTarget = await doctorElement.$('xpath=./following-sibling::a[contains(text(), "상세보기")]') ||
                                  await doctorElement.$('xpath=./following-sibling::button[contains(text(), "상세보기")]') ||
                                  await doctorElement.$('xpath=./parent::*/a') ||
                                  await doctorElement.$('xpath=./parent::*/button') ||
                                  doctorElement;

                if (clickTarget) {
                    const [popup] = await Promise.all([
                        new Promise(resolve => context.once('page', resolve)),
                        clickTarget.click()
                    ]);

                    if (popup) {
                        page = popup;
                        await page.waitForLoadState('domcontentloaded');
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

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic ---

        // Extract Profile URL
        const doctorDetailStyle = $('.doctor_detail').attr('style');
        if (doctorDetailStyle) {
            const match = doctorDetailStyle.match(/url\(([^)]+)\)/);
            if (match && match[1]) {
                const relativeUrl = match[1].replace(/\\\"/g, ''); // Remove escaped quotes
                parsedDetails.profileUrl = new URL(relativeUrl, doctorData.hospital_site).href;
            }
        }

        // Extract Specialty
        parsedDetails.specialty = $('p.professional_field').last().text().trim();

        // Extract 학력, 경력, 연수, 학회, 수상, 논문
        $('.roadmap_scroll').each((i, el) => {
            const title = $(el).find('h3').text().trim();
            const contentHtml = $(el).find('p').html(); // Get inner HTML to preserve <br>
            if (contentHtml) {
                switch (title) {
                    case '학력':
                        parsedDetails.학력 = extractListItemsFromBr(contentHtml);
                        break;
                    case '경력':
                        parsedDetails.경력 = extractListItemsFromBr(contentHtml);
                        break;
                    case '연수':
                        parsedDetails.연수 = extractListItemsFromBr(contentHtml); // Assuming 연수 is similar to 학력/경력
                        break;
                    case '학회':
                        parsedDetails.학술 = extractListItemsFromBr(contentHtml); // Assuming 학회 maps to 학술
                        break;
                    case '수상':
                        parsedDetails.수상 = extractListItemsFromBr(contentHtml);
                        break;
                    case '논문':
                        parsedDetails.논문 = extractSimpleListFromBr(contentHtml);
                        break;
                    // Add other cases if needed
                }
            }
        });

        // 언론 (Media Coverage) - This section seems to be in a different part of the HTML
        // and requires specific parsing. Based on the provided HTML, it's in .movieList2 .indi_resume22 .ul1
        const mediaItems = [];
        $('.movieList2 .indi_resume22 .ul1 li').each((i, el) => {
            const link = $(el).find('a');
            const text = link.text().trim();
            const url = link.attr('href');
            // Date is not directly available in the provided snippet for media items,
            // so it will remain null or require more complex extraction if present elsewhere.
            const badgeText = $(el).find('.badge.rect').text().trim(); // e.g., "KBS", "NEWS"
            
            mediaItems.push({
                targetDate: null, // Not directly available in this snippet
                type: badgeText || null, // Using badge text as type
                text: text.replace(/"/g, ''),
                url: url || null,
                issuer: null // Not directly available in this snippet
            });
        });
        parsedDetails.언론 = mediaItems;

        // 저서 (Books) - Not explicitly found in the provided HTML snippet, assuming it might be similar to 논문 if present.
        // If not found, it will remain an empty array.
        if (!parsedDetails.저서) {
            parsedDetails.저서 = [];
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
        error: error,
        ...parsedDetails
    }));
})();