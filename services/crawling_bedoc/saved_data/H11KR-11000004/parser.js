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
        // --- IMPORTANT NOTE ON "더보기" BUTTONS ---
        // This parser includes a generic 'clickMoreButtons' function that attempts to click common
        // "더보기" (view more) buttons to load additional content (e.g., for 학력, 경력, 논문).
        // If a specific "더보기" button on this hospital's site is not being clicked,
        // its selector might need to be added to the 'moreButton' selectors within the 'clickMoreButtons' function.
        // The function clicks up to 10 times and waits 1 second after each click.
        // ------------------------------------------
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

        // --- Start of "더보기" button handling ---
        const clickMoreButtons = async () => {
            const maxClicks = 10; // Limit to prevent infinite loops
            let clickedCount = 0;
            let buttonFound = true;

            while (buttonFound && clickedCount < maxClicks) {
                buttonFound = false;
                // Look for common "더보기" button selectors
                const moreButton = await page.$('button:has-text("더보기")') ||
                                   await page.$('a:has-text("더보기")') ||
                                   await page.$('button:has-text("더보기 +")') ||
                                   await page.$('a:has-text("더보기 +")');

                if (moreButton) {
                    try {
                        await moreButton.click();
                        await page.waitForTimeout(1000); // Wait for content to load (adjust as needed)
                        clickedCount++;
                        buttonFound = true; // Found and clicked, so loop again
                    } catch (clickError) {
                        console.log(`Could not click more button: ${clickError.message}`);
                        buttonFound = false;
                    }
                }
            }
        };

        await clickMoreButtons();
        // --- End of "더보기" button handling ---

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic ---

        // Extract Profile URL
        const doctorImgBoxStyle = $('div.doctor_imgbox.pc_show').attr('style');
        if (doctorImgBoxStyle) {
            const match = doctorImgBoxStyle.match(/url\(([^)]+)\)/);
            if (match && match[1]) {
                const relativeUrl = match[1].replace(/\\\"/g, ''); // Remove escaped quotes
                parsedDetails.profileUrl = new URL(relativeUrl, doctorData.hospital_site).href;
            }
        }

        // Extract Specialty
        parsedDetails.specialty = $('p.f_l:contains("전문분야") + ul.f_l.ml15 li').text().trim();

        // Extract 학력, 경력, 연수, 학회, 수상, 논문, 저서
        $('div.info_box.infotable_box').each((i, el) => {
            const title = $(el).find('h4.info_box_tit').text().trim();
            const tableRows = $(el).find('tbody tr');
            let items = [];

            tableRows.each((j, row) => {
                const date = $(row).find('th').text().trim();
                const content = $(row).find('td').text().trim();
                if (date || content) {
                    items.push({ date: date || null, content: content.replace(/"/g, '') });
                }
            });

            if (items.length > 0) {
                switch (title) {
                    case '학력':
                        parsedDetails.학력 = items;
                        break;
                    case '경력':
                        parsedDetails.경력 = items;
                        break;
                    case '활동': // This seems to be 학술
                        parsedDetails.학술 = items;
                        break;
                    case '연구현황': // This seems to be 논문
                        parsedDetails.논문 = items.map(item => item.content); // 논문 is array of strings
                        break;
                    case '저서':
                        parsedDetails.저서 = items.map(item => item.content); // 저서 is array of strings
                        break;
                    case '수상이력': // This seems to be 수상
                        parsedDetails.수상 = items;
                        break;
                }
            }
        });

        // 언론 (Media Coverage) - This section seems to be in a different part of the HTML
        // and requires specific parsing. Based on the provided HTML, it's in .infonews_box_list ul#news
        const mediaItems = [];
        $('div.infonews_box_list ul#news li').each((i, el) => {
            const link = $(el).find('a');
            const text = link.find('p.title').text().trim();
            const url = link.attr('href');
            const date = link.find('p.gry').last().text().trim(); // Date is in a p tag
            
            mediaItems.push({
                targetDate: date || null,
                type: null,
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