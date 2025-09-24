const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const $ = cheerio.load(html);

        const synthesizedData = {
            "학력": [],
            "경력": [],
            "학술": [],
            "논문": [],
            "수상": [],
            "저서": [],
            "언론": []
        };

        const profileImgSrc = $('div.doctorSec img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
        }

        synthesizedData.specialty = $("#tab0 div.doctorInfo strong:contains('진료분야')").first().next('p').text().trim().replace(/\s+/g, ' ').replace(/"/g, '');

        $('#tabCon1000 .table_wrap tbody tr').each((i, el) => {
            const title = $(el).find('th p').text().trim();
            const items = [];
            $(el).find('td ul.listDotColor li').each((j, itemEl) => {
                const date = $(itemEl).find('span').first().text().trim();
                const content = $(itemEl).find('span').last().text().trim().replace(/"/g, '');
                if (content) {
                    items.push({ date, content });
                }
            });

            if (title === '학력') {
                synthesizedData.학력 = items;
            } else if (title === '경력') {
                synthesizedData.경력 = items;
            } else if (title === '학회활동') {
                synthesizedData.학술 = items;
            }
        });

        $('#tabCon10000 .table_wrap tbody tr').each((i, el) => {
            const title = $(el).find('th p').text().trim();
            if (title === '논문') {
                $(el).find('td ul.listDotColor li').each((j, itemEl) => {
                    const itemText = $(itemEl).text().trim().replace(/\s+/g, ' ').replace(/"/g, '');
                    if (itemText) {
                        if (itemText.includes('Award') || itemText.includes('Fund') || itemText.includes('상')) {
                            const dateMatch = itemText.match(/^(\d{4})/);
                            const date = dateMatch ? dateMatch[1] : null;
                            synthesizedData.수상.push({ date: date, content: itemText.replace(/^(\d{4})\s*/, '') });
                        } else {
                            synthesizedData.논문.push(itemText);
                        }
                    }
                });
            }
        });

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
