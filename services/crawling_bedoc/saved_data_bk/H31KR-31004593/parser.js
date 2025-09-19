const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function parse() {
    const hospitalSite = process.argv[2];
    const doctorName = process.argv[3];

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(hospitalSite, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const doctorContainer = page.locator('div.col-md-3.col-sm-6.col-xs-12.margin-bottom2', { has: page.locator('img[src="/images/m-team/man02t-23.jpg"]') });
        await doctorContainer.locator('a.image-popup-vertical-fit').click();

        await page.waitForSelector('.mfp-content', { timeout: 10000 });
        
        const popupHtml = await page.locator('.mfp-content').innerHTML();
        const $ = cheerio.load(popupHtml);

        const education = [];
        const experience = [];
        const books = [];
        let specialty = null;

        $('ul.margin-left2 li.txw').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('전문의')) {
                specialty = text;
            } else if (text.includes('졸업') || text.includes('박사')) {
                education.push({ date: null, content: text });
            } else if (text.includes('출간')) {
                books.push({ date: null, content: text });
            }
            else {
                experience.push({ date: null, content: text });
            }
        });

        synthesizedData = {
            specialty: specialty,
            '학력': education,
            '경력': experience,
            '저서': books
        };

    } catch (e) {
        synthesizedData.error = e.message;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(synthesizedData, null, 2));
}

parse();