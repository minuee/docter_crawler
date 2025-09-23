
const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        synthesizedData.isAttend = true;

        const profileUrlSrc = $('.pic img').attr('src');
        if (profileUrlSrc) {
            synthesizedData.profileUrl = new URL(profileUrlSrc, hospital_site).href;
        }

        synthesizedData.specialty = $('dt:contains("전문분야")').next('dd').text().trim();

        const extractList = (title) => {
            const items = [];
            $(`h2.tit:contains("${title}")`).next('ul.list_type.m1').find('li').each((i, el) => {
                items.push($(el).text().trim().replace(/"/g, ''));
            });
            return items;
        };
        
        synthesizedData.학력 = extractList('학력사항').map(item => ({ content: item }));
        synthesizedData.경력 = extractList('경력사항').map(item => ({ content: item }));
        synthesizedData.논문 = extractList('논문리스트');
        synthesizedData.학술 = extractList('학술활동').map(item => ({ content: item }));
        synthesizedData.언론 = extractList('언론보도').map(item => {
            const match = item.match(/\b\[(.*)\]\s*(.*)\s*\((\d{4})\)/);
            if (match) {
                return { issuer: match[1], text: match[2].trim(), targetDate: match[3] };
            }
            return { text: item };
        });

    } catch (e) {
        error = e.stack;
    } finally {
        await browser.close();
        console.log(JSON.stringify({ ...synthesizedData, error }, null, 2));
    }
}

main();
