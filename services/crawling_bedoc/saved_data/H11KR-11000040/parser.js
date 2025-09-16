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

        await clickMoreButtons(page); // Click more buttons on the main page

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        // Sanitize HTML (remove scripts, styles, etc.)
        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic for Kangnam Hallym Hospital ---
        // Extract Profile URL
        const profileImgSrc = $('article.pic img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        // Extract Specialty
        parsedDetails.specialty = $('div.denti p').text().trim();

        // Extract 학력
        const educationText = $('h4:contains("학력") + table td.dw-02').html();
        if (educationText) {
            parsedDetails.학력 = educationText.split('<p>').map(item => {
                const trimmedItem = item.trim();
                if (trimmedItem) {
                    const match = trimmedItem.match(/^<span>(.*?)<\/span><span>(.*?)<\/span>$/);
                    if (match) {
                        return { date: match[1].trim(), content: match[2].trim().replace(/<[^>]*>/g, '').replace(/"/g, '') };
                    } else {
                        return { date: null, content: trimmedItem.replace(/"/g, '') };
                    }
                }
                return null;
            }).filter(item => item !== null);
        }

        // Extract 경력
        const careerText = $('h4:contains("경력") + table td.dw-02').html();
        if (careerText) {
            parsedDetails.경력 = careerText.split('<p>').map(item => {
                const trimmedItem = item.trim();
                if (trimmedItem) {
                    const match = trimmedItem.match(/^<span>(.*?)<\/span><span>(.*?)<\/span>$/);
                    if (match) {
                        return { date: match[1].trim(), content: match[2].trim().replace(/<[^>]*>/g, '').replace(/"/g, '') };
                    } else {
                        return { date: null, content: trimmedItem.replace(/"/g, '') };
                    }
                }
                return null;
            }).filter(item => item !== null);
        }

        // Extract 학술
        const academicText = $('h4:contains("학회활동") + table td').html();
        if (academicText) {
            parsedDetails.학술 = academicText.split('<p>').map(item => {
                const trimmedItem = item.trim();
                if (trimmedItem) {
                    const match = trimmedItem.match(/^<span>(.*?)<\/span><span>(.*?)<\/span>$/);
                    if (match) {
                        return { date: match[1].trim(), content: match[2].trim().replace(/<[^>]*>/g, '').replace(/"/g, '') };
                    } else {
                        return { date: null, content: trimmedItem.replace(/"/g, '') };
                    }
                }
                return null;
            }).filter(item => item !== null);
        }

        // Extract 수상
        const awardText = $('h4:contains("수상이력") + table td.dw-02').html();
        if (awardText) {
            parsedDetails.수상 = awardText.split('<p>').map(item => {
                const trimmedItem = item.trim();
                if (trimmedItem) {
                    const match = trimmedItem.match(/^<span>(.*?)<\/span><span>(.*?)<\/span>$/);
                    if (match) {
                        return { date: match[1].trim(), content: match[2].trim().replace(/<[^>]*>/g, '').replace(/"/g, '') };
                    } else {
                        return { date: null, content: trimmedItem.replace(/"/g, '') };
                    }
                }
                return null;
            }).filter(item => item !== null);
        }

        // Extract 논문 (from tab_con03 after clicking)
        // This will be handled after clicking the tab.
        parsedDetails.논문 = [];

        // Handle "언론보도" tab
        try {
            const mediaTab = await page.$('a[href="#tab_con03"]');
            if (mediaTab) {
                await mediaTab.click();
                await page.waitForSelector('#tab_con03.active', { state: 'visible', timeout: 10000 }); // Wait for tab to become active

                const mediaContentHtml = await page.$eval('#tab_con03 div.pr#boardContents', el => el.innerHTML);
                const $media = cheerio.load(mediaContentHtml);

                const mediaItems = [];
                $media('p').each((i, el) => { // Assuming each item is in a <p> tag
                    const text = $(el).text().trim();
                    if (text) {
                        // Attempt to extract date and title from the text
                        const match = text.match(/^\\\[(.*?)\\\]\\s*(.*)$/); // Example: [중앙일보] 기사 제목
                        if (match) {
                            mediaItems.push({
                                targetDate: null, // Date not easily extractable from this format
                                type: "기사",
                                text: text.replace(/"/g, ''),
                                url: null, // URL not available in this snippet
                                issuer: match[1].trim()
                            });
                        } else {
                            mediaItems.push({
                                targetDate: null,
                                type: "기사",
                                text: text.replace(/"/g, ''),
                                url: null,
                                issuer: null
                            });
                        }
                    }
                });
                parsedDetails.언론 = mediaItems;
            }
        } catch (tabError) {
            console.log(`Error handling media tab: ${tabError.message}`);
            parsedDetails.언론 = []; // Ensure it's an empty array on error
        }

        // Initialize other fields as empty arrays if not found
        if (!parsedDetails.언론) parsedDetails.언론 = [];
        if (!parsedDetails.저서) parsedDetails.저서 = [];

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