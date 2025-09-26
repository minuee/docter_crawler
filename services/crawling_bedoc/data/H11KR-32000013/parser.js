const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    const jsonPath = process.argv[2];
    if (!jsonPath) {
        console.error('Please provide a path to the JSON file as an argument.');
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
        console.error('Failed to read or parse the JSON file.');
        process.exit(1);
    }

    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    let page = await context.newPage();

    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        let rawHtml = await page.content();
        let $ = cheerio.load(rawHtml);

        if (rawHtml.includes(bedoc_doctorname)) {
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
        const thesisTabHtml = $('#tab_con02').html();
        if (thesisTabHtml) {
            const $thesis = cheerio.load(thesisTabHtml);
            $thesis('h3').each((i, el) => {
                const title = $(el).text().trim();
                if (title === '논문') {
                    const thesisListHtml = $(el).next('.thesis_list').html();
                    if (thesisListHtml) {
                        parsedDetails.논문 = thesisListHtml.split('<br>').map(item => item.trim().replace(/"/g, '')).filter(item => item);
                    }
                } else if (title === '저서') {
                    const bookListHtml = $(el).next('.thesis_list').html(); // Assuming same structure
                    if (bookListHtml) {
                        parsedDetails.저서 = bookListHtml.split('<br>').map(item => {
                            const yearMatch = item.match(/^(\d{4}년)/);
                            const date = yearMatch ? yearMatch[1] : null;
                            const content = item.replace(/^\d{4}년,?\s*/, '').trim();
                            return { date: date, content: content.replace(/"/g, ''), issuer: null };
                        }).filter(item => item.content);
                    }
                }
            });
        }

        parsedDetails.언론 = [];
        try {
            const mediaTab = await page.$('a[href="#tab_con03"]');
            if (mediaTab) {
                await mediaTab.click();
                await page.waitForSelector('#boardContents p', { state: 'visible', timeout: 10000 });
                const mediaHtml = await page.innerHTML('#boardContents');
                const $media = cheerio.load(mediaHtml);
                $media('p').each((i, el) => {
                    const aTag = $(el).find('a');
                    const title = aTag.text().trim().replace(/"/g, '');
                    if (title) {
                        const href = aTag.attr('href');
                        let url = null;
                        if (href && href.includes('goNews')) {
                            const urlMatch = href.match( /\'([^']+)\'/ );
                            if (urlMatch) {
                                url = urlMatch[1];
                            }
                        }
                        const date = $(el).find('span').text().trim();
                        const fullText = $(el).text().trim();
                        const issuerMatch = fullText.match(/ \s*(.*)/);
                        const issuer = issuerMatch ? issuerMatch[1].trim() : null;

                        parsedDetails.언론.push({
                            targetDate: date,
                            type: '기사',
                            text: title,
                            url: url,
                            issuer: issuer
                        });
                    }
                });
            }
        } catch (tabError) {
            console.log(`Error handling media tab: ${tabError.message}`);
        }

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`; 
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    const finalData = { ...doctorData, ...parsedDetails, isAttend, error };
    if (!error && (finalData.학력.length > 0 || finalData.경력.length > 0)) {
        finalData.isExist = true;
        finalData.isSearchType = 'html_playwright';
        finalData.error = null;
    } else {
        finalData.isExist = false;
        finalData.isSearchType = 'html_playwright_failed';
    }

    fs.writeFileSync(jsonPath, JSON.stringify(finalData, null, 2));

})();