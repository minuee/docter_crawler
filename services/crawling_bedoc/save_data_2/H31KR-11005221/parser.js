

const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector(`h3:has-text("${bedoc_doctorname}")`, { timeout: 10000 });
        
        const mainHtml = await page.content();
        const $ = cheerio.load(mainHtml);

        synthesizedData.학력 = [];
        synthesizedData.경력 = [];

        $('#text_w20220815fe27e805e501c ul li').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('대학') || text.includes('졸업') || text.includes('박사') || text.includes('석사')) {
                synthesizedData.학력.push({ content: text.replace(/\"/g, '') });
            } else {
                synthesizedData.경력.push({ content: text.replace(/\"/g, '') });
            }
        });

        $('#text_w20220829ab586cd3e098c p').each((i, el) => {
            const text = $(el).text().trim();
            if(text) synthesizedData.경력.push({ content: text.replace(/\"/g, '') });
        });

        const moreButton = page.locator('div.doz_row')
            .filter({ has: page.locator(`h3:has-text("${bedoc_doctorname}")`) })
            .locator('a:has-text("진료시간 및 프로필 더보기")');
        
        if (await moreButton.count() > 0) {
            await moreButton.click();
            await page.waitForSelector(`.modal-content:has-text("${bedoc_doctorname}")`, { state: 'visible', timeout: 5000 });
            await page.waitForTimeout(1000);
            
            const modalHtml = await page.locator(`.modal-content:has-text("${bedoc_doctorname}")`).innerHTML();
            const $$ = cheerio.load(modalHtml);

            synthesizedData.논문 = [];
            $$('div[id*="w20220829a04"] ul li').each((i, el) => {
                synthesizedData.논문.push($$(el).text().trim().replace(/\"/g, ''));
            });

            synthesizedData.저서 = [];
            $$('div[id*="w2023031651f"] ul li').each((i, el) => {
                synthesizedData.저서.push({ content: $$(el).text().trim().replace(/\"/g, '') });
            });
        }
        
        synthesizedData.isAttend = true;

    } catch (e) {
        error = e.stack;
    } finally {
        await browser.close();
        console.log(JSON.stringify({ ...synthesizedData, error }, null, 2));
    }
}

main();
