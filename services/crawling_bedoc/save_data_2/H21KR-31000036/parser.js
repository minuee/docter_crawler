
const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

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
        const content = await page.content();
        const $ = cheerio.load(content);

        synthesizedData.isAttend = true;
        
        const profileUrlSrc = $('.doc-img-box img').attr('src');
        if (profileUrlSrc) {
            synthesizedData.profileUrl = new URL(profileUrlSrc, hospital_site).href;
        }

        synthesizedData.specialty = $('.detail-doc-speciality > span').text().trim();

        synthesizedData.학력 = [];
        synthesizedData.경력 = [];
        synthesizedData.저서 = [];
        synthesizedData.학술 = [];
        synthesizedData.언론 = [];

        $('.detail-doc-activity .activity-item').each((i, el) => {
            const title = $(el).find('h4').text().trim();
            const items = [];
            $(el).find('ul li').each((j, itemEl) => {
                items.push($(itemEl).text().trim());
            });

            if (title === '경력') {
                items.forEach(item => {
                    if (item.includes('수료') || item.includes('대학') || item.includes('과정')) {
                        synthesizedData.학력.push({ content: item });
                    } else {
                        synthesizedData.경력.push({ content: item });
                    }
                });
            } else if (title === '학술활동') {
                 items.forEach(item => {
                    if (item.includes('저자')) {
                        synthesizedData.저서.push({ content: item });
                    } else {
                        synthesizedData.학술.push({ content: item });
                    }
                });
            }
        });

        $('.doc-press-swiper-slide').each((i, el) => {
            const onclickAttr = $(el).attr('onclick');
            const urlMatch = onclickAttr ? onclickAttr.match(/window.open("(.*?)")/) : null;
            const url = urlMatch ? urlMatch[1] : null;
            
            const issuer = $(el).find('.doc-press-category-box em').text().trim();
            const targetDate = $(el).find('.doc-press-category-box span').text().trim();
            const text = $(el).find('p').text().trim();

            synthesizedData.언론.push({
                targetDate,
                type: '기사', // Assuming all are articles
                text,
                url,
                issuer
            });
        });

    } catch (e) {
        error = `Error during Playwright execution for ${bedoc_doctorname}: ${e.message}`;
        synthesizedData.isAttend = false; // Cannot confirm attendance if page fails
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...synthesizedData, error }));
}

main();
