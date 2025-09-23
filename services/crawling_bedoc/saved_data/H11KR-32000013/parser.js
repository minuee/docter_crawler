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

        const clickMoreButtons = async (currentPage) => {
            const maxClicks = 10;
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
                        await currentPage.waitForTimeout(1000);
                        clickedCount++;
                        buttonFound = true;
                    } catch (clickError) {
                        console.log(`Could not click more button: ${clickError.message}`);
                        buttonFound = false;
                    }
                }
            }
        };

        await clickMoreButtons(page);

        let rawHtml = await page.content();
        let $ = cheerio.load(rawHtml);

        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        const profileImgSrc = $('article.pic img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        parsedDetails.specialty = $('div.denti p').text().trim().replace(/"/g, '');

        parsedDetails.학력 = [];
        $('h4:contains("학력") + table td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const dateMatch = $(el).find('span').eq(0).text().trim();
                const contentMatch = $(el).find('span').eq(1).text().trim();
                parsedDetails.학력.push({
                    date: dateMatch || null,
                    content: contentMatch.replace(/"/g, '') || text.replace(/"/g, '')
                });
            }
        });

        parsedDetails.경력 = [];
        $('h4:contains("경력") + table td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const dateMatch = $(el).find('span').eq(0).text().trim();
                const contentMatch = $(el).find('span').eq(1).text().trim();
                parsedDetails.경력.push({
                    date: dateMatch || null,
                    content: contentMatch.replace(/"/g, '') || text.replace(/"/g, '')
                });
            }
        });

        parsedDetails.학술 = [];
        $('h4:contains("학회활동") + table td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const dateMatch = $(el).find('span').eq(0).text().trim();
                const contentMatch = $(el).find('span').eq(1).text().trim();
                parsedDetails.학술.push({
                    date: dateMatch || null,
                    content: contentMatch.replace(/"/g, '') || text.replace(/"/g, '')
                });
            }
        });

        parsedDetails.수상 = [];
        $('h4:contains("수상이력") + table td.dw-02 p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const dateMatch = $(el).find('span').eq(0).text().trim();
                const contentMatch = $(el).find('span').eq(1).text().trim();
                parsedDetails.수상.push({
                    date: dateMatch || null,
                    content: contentMatch.replace(/"/g, '') || text.replace(/"/g, '')
                });
            }
        });

        parsedDetails.논문 = [];
        parsedDetails.저서 = [];
        try {
            const thesisTab = await page.$('a[href="#tab_con02"]');
            if (thesisTab) {
                await thesisTab.click();
                await page.waitForSelector('#tab_con02.active', { state: 'visible', timeout: 10000 });
                await page.waitForTimeout(1000);

                const thesisContainer = await page.$('#tab_con02');
                if (thesisContainer) {
                    const thesisList = await thesisContainer.$('div.thesis_list');
                    if (thesisList) {
                        const thesisContentHtml = await thesisList.innerHTML();
                        const $thesis = cheerio.load(thesisContentHtml);
                        $thesis('br').replaceWith('\n');
                        const thesisText = $thesis.text().trim();

                        if (thesisText) {
                            const lines = thesisText.split('\n').map(line => line.trim()).filter(Boolean);
                            let currentSection = null;
                            lines.forEach(line => {
                                if (line === '저서') {
                                    currentSection = 'books';
                                } else if (line === '논문') {
                                    currentSection = 'papers';
                                } else if (line === '특허') {
                                    currentSection = 'patents'; 
                                } else if (currentSection === 'books') {
                                    const yearMatch = line.match(/^(\d{4}년)/);
                                    const date = yearMatch ? yearMatch[1] : null;
                                    const content = line.replace(/^\d{4}년,?\s*/, '');
                                    parsedDetails.저서.push({ date: date, content: content.replace(/"/g, ''), issuer: null });
                                } else if (currentSection === 'papers') {
                                    if (line !== '그 외 다수.') {
                                        parsedDetails.논문.push(line.replace(/^\d+\.\s*/, '').replace(/"/g, ''));
                                    }
                                }
                            });

                        }
                    }
                }
            }
        } catch (tabError) {
            console.log(`Error handling thesis tab: ${tabError.message}`);
        }

        parsedDetails.언론 = [];

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`; 
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    console.log(JSON.stringify({
        isAttend: isAttend,
        error: error,
        ...parsedDetails
    }));
})();
