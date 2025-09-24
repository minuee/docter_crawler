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

        const synthesizedData = {};

        const profileImgSrc = $('.middle-img img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
        }

        synthesizedData.specialty = $('.pro-part .conte').text().trim().replace(/"/g, '');

        const parseSectionByTitle = (title) => {
            const items = [];
            $(".so-tit span:contains('" + title + "')").parent().nextAll('p').each((i, el) => {
                let text = $(el).html().split('<br>').map(s => s.trim()).filter(s => s);
                text.forEach(line => {
                    const dateMatch = line.match(/(\d{4})/);
                    const date = dateMatch ? dateMatch[1] : null;
                    const content = line.replace(/<[^>]*>/g, '').replace(/(\d{4})/g, '').trim().replace(/"/g, '');
                    if(content) items.push({ date, content });
                });
            });
            return items;
        }
        
        const parseAwards = (title) => {
             const items = [];
            $(".so-tit span:contains('" + title + "')").parent().nextAll('p').each((i, el) => {
                let text = $(el).html().split('<br>').map(s => s.trim()).filter(s => s);
                text.forEach(line => {
                    const dateMatch = line.match(/^(\d{4})년/);
                    const date = dateMatch ? dateMatch[1] : null;
                    const content = line.replace(/^(\d{4}년\s*)/, '').trim().replace(/"/g, '');
                    if(content) items.push({ date, content });
                });
            });
            return items;
        }

        synthesizedData.학력 = parseSectionByTitle('학력사항');
        synthesizedData.경력 = parseSectionByTitle('경력사항');
        synthesizedData.수상 = parseAwards('주요활동');

        synthesizedData.논문 = [];
        $('#tab-2 .part p').each((i, el) => {
            const paper = $(el).text().trim().replace(/"/g, '');
            if (paper) {
                synthesizedData.논문.push(paper.replace(/^\d+\.\s*/, ''));
            }
        });
        
        synthesizedData.학술 = [];
        synthesizedData.저서 = [];
        synthesizedData.언론 = [];

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
