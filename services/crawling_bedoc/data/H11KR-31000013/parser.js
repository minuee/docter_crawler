
const { chromium } = require('playwright');
const cheerio = require('cheerio');

// Final parser for National Cancer Center, incorporating user's debugging feedback.

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let result = {};
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'load', timeout: 60000 });

        // Locator based on user's previous hint
        const doctorLocator = page.locator(`a[onclick*="viewDetail"]:has-text("${bedoc_doctorname}")`);

        if (await doctorLocator.count() === 0) {
            throw new Error(`Doctor link for ${bedoc_doctorname} with 'viewDetail' not found.`);
        }

        const [popup] = await Promise.all([
            page.waitForEvent('popup', { timeout: 15000 }),
            doctorLocator.click(),
        ]);

        // Wait for a specific, reliable element on the popup page, per user's suggestion.
        await popup.waitForSelector('h1.logo:has(img[alt="국립암센터 로고"])', { state: 'visible', timeout: 60000 });

        const popupContent = await popup.content();
        const $ = cheerio.load(popupContent);

        const synthesizedData = {};
        synthesizedData.isAttend = $('body').text().includes(bedoc_doctorname);
        synthesizedData.profileUrl = new URL($('#profilePhoto').attr('src'), hospital_site).href;
        synthesizedData.specialty = $('p.comment').text().trim();
        synthesizedData.학력 = [];
        synthesizedData.경력 = [];
        synthesizedData.논문 = [];
        synthesizedData.저서 = [];
        synthesizedData.수상 = [];
        synthesizedData.언론 = [];

        $('#tabCon02 table').each((i, tableEl) => {
            const summary = $(tableEl).attr('summary');
            const rows = $(tableEl).find('tbody tr');

            if (summary === '학력 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                    const date = `${$(tds[0]).text().trim()} ~ ${$(tds[1]).text().trim()}`;
                    const content = `${$(tds[2]).text().trim()} ${$(tds[3]).text().trim()}`;
                    if (content.trim()) synthesizedData.학력.push({ date, content });
                });
            } else if (summary === '경력 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                    const date = `${$(tds[0]).text().trim()} ~ ${$(tds[1]).text().trim()}`;
                    const content = `${$(tds[2]).text().trim()} ${$(tds[3]).text().trim()}`;
                    if (content.trim()) synthesizedData.경력.push({ date, content });
                });
            } else if (summary === '주요논문 상세보기') {
                 rows.each((j, rowEl) => {
                    const title = $(rowEl).find('a').text().trim();
                    if (title) synthesizedData.논문.push(title);
                });
            }
        });
        result = synthesizedData;

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...result, error }));
}

main();
