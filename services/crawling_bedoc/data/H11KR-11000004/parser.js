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

        // Take a screenshot for debugging
        await page.screenshot({ path: 'debug_screenshot.png' });
        console.log('Screenshot taken: debug_screenshot.png');

        // --- Start of "더보기" button handling ---
        const clickMoreButtons = async () => {
            const maxClicks = 50; // Set a hard limit to prevent infinite loops
            let clickedCount = 0;

            while (clickedCount < maxClicks) {
                console.log(`--- Iteration ${clickedCount + 1} ---`);
                let buttonFoundAndClickedThisIteration = false;

                // Store initial counts
                const initialThesisCount = (await page.$('tbody#thesis tr'))?.length || 0;
                const initialBookCount = (await page.$('tbody#book tr'))?.length || 0;
                const initialGenericContentCount = (await page.$('div.info_box.infotable_box tbody tr'))?.length || 0;
                const initialNewsCount = (await page.$('div.infonews_box_list ul#news li'))?.length || 0;

                // Attempt to click generic "더보기" button
                const genericMoreButton = await page.$('button:has-text("더보기"), a:has-text("더보기"), button:has-text("더보기 +"), a:has-text("더보기 +")');
                if (genericMoreButton) {
                    try {
                        console.log('Found generic "더보기" button.');
                        await genericMoreButton.click();
                        await page.waitForFunction(
                            (counts) => 
                                (document.querySelectorAll('div.info_box.infotable_box tbody tr').length > counts.generic) ||
                                (document.querySelectorAll('div.infonews_box_list ul#news li').length > counts.news),
                            { timeout: 5000 },
                            { generic: initialGenericContentCount, news: initialNewsCount }
                        );
                        console.log('Generic content expanded.');
                        buttonFoundAndClickedThisIteration = true;
                    } catch (e) {
                        console.log('Generic "더보기" click did not expand content or timed out.');
                    }
                }

                // Attempt to click thesis "더보기" button
                const thesisButtonSelector = 'a.btn_gray_line[href="javascript:moreThesis();"]';
                const thesisMoreButton = await page.$(thesisButtonSelector);
                if (thesisMoreButton) {
                    try {
                        console.log('Found thesis "더보기" button.');
                        await page.evaluate(() => moreThesis());
                        await page.waitForFunction(
                            (initialCount) => document.querySelectorAll('tbody#thesis tr').length > initialCount,
                            { timeout: 5000 },
                            initialThesisCount
                        );
                        console.log('Thesis content expanded.');
                        buttonFoundAndClickedThisIteration = true;
                    } catch (e) {
                        console.log('Thesis "더보기" click did not expand content or timed out.');
                    }
                }

                // Attempt to click book "더보기" button
                const bookMoreButton = await page.$('a[href="javascript:fnGetTreatise(\'book\');"]');
                if (bookMoreButton) {
                    try {
                        console.log('Found book "더보기" button.');
                        await page.evaluate(() => fnGetTreatise('book'));
                        await page.waitForFunction(
                            (initialCount) => document.querySelectorAll('tbody#book tr').length > initialCount,
                            { timeout: 5000 },
                            initialBookCount
                        );
                        console.log('Book content expanded.');
                        buttonFoundAndClickedThisIteration = true;
                    } catch (e) {
                        console.log('Book "더보기" click did not expand content or timed out.');
                    }
                }

                if (buttonFoundAndClickedThisIteration) {
                    clickedCount++;
                    await page.waitForTimeout(1000); // Wait a bit for UI to settle
                } else {
                    console.log('No more expandable content found. Exiting loop.');
                    break; // Exit loop if no buttons were successfully clicked and expanded content
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

        // Extract 학력, 경력, 연수, 학회, 수상
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
                    case '수상이력': // This seems to be 수상
                        parsedDetails.수상 = items;
                        break;
                }
            }
        });

        // Extract 논문 (Thesis/Papers)
        const thesisItems = [];
        $('tbody#thesis tr').each((i, row) => {
            const content = $(row).find('td').text().trim();
            if (content) {
                thesisItems.push(content.replace(/"/g, ''));
            }
        });
        if (thesisItems.length > 0) {
            parsedDetails.논문 = thesisItems;
        }

        // Extract 저서 (Books)
        const bookItems = [];
        $('tbody#book tr').each((i, row) => {
            const date = $(row).find('th').text().trim();
            const content = $(row).find('td').text().trim();
            if (content) {
                let bookContent = content.replace(/"/g, '');
                let issuer = null; // Issuer is not directly available in the HTML content for 저서
                bookItems.push({ date: date || null, content: bookContent, issuer: issuer });
            }
        });
        if (bookItems.length > 0) {
            parsedDetails.저서 = bookItems;
        }

        // 언론 (Media Coverage)
        const mediaItems = [];
        $('div.infonews_box_list ul#news li').each((i, el) => {
            const link = $(el).find('a');
            const fullText = link.find('p.title').text().trim();
            const url = link.attr('href');
            const date = link.find('p.gry').last().text().trim();

            let type = null;
            let text = fullText.replace(/"/g, '');
            let issuer = null;

            // Try to infer type and issuer from the text
            const newsMatch = fullText.match(/\ \[(.*?)\ \]\s*(.*)/); // e.g., [한국일보] ...
            if (newsMatch) {
                issuer = newsMatch[1].trim();
                text = newsMatch[2].trim().replace(/"/g, '');
                type = '기사'; // Assuming if there's an issuer in brackets, it's a news article
            } else if (fullText.includes('유튜브')) {
                type = '유튜브';
            }

            mediaItems.push({
                targetDate: date || null,
                type: type,
                text: text,
                url: url || null,
                issuer: issuer
            });
        });
        if (mediaItems.length > 0) {
            parsedDetails.언론 = mediaItems;
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