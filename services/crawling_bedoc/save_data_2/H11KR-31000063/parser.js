const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function parse() {
    const url = process.argv[2];
    if (!url) {
        console.error('URL is required.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], 논문: [], 언론: [], 저서: [] };

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const staticHtml = await page.content();
        const $ = cheerio.load(staticHtml);

        synthesizedData.profileUrl = new URL($('article.pic img').attr('src'), url).href;
        synthesizedData.specialty = $('div.denti p').attr('title');

        const parseTable = (title) => {
            const items = [];
            $(`#tab_con01 h4:contains('${title}')`).next('table').find('td p').each((i, p) => {
                const date = $(p).find('span').eq(0).text().trim();
                const content = $(p).find('span').eq(1).text().trim();
                if (content) {
                    items.push({ date: date || null, content });
                }
            });
            return items;
        };

        synthesizedData.학력 = parseTable('학력');
        synthesizedData.경력 = parseTable('경력');
        synthesizedData.학술 = parseTable('학회활동');

        const publicationsHtml = $('#tab_con02 .thesis_list').html();
        if (publicationsHtml) {
            const lines = publicationsHtml.split('<br>').map(l => cheerio.load(l).text().trim()).filter(l => l);
            lines.forEach(line => {
                if (line.startsWith('대표 논문 및 저서')) return;
                if (line.includes('저서') || line.includes('저자')) {
                     synthesizedData.저서.push({ date: null, content: line.replace(/^\\d+\\.\s*/, ''), issuer: null });
                } else if (line) {
                     synthesizedData.논문.push(line.replace(/^\\d+\\.\s*/, ''));
                }
            });
        }

        try {
            await page.click('a[href="#tab_con03"]');
            await page.waitForSelector('#boardContents ul li', { state: 'visible', timeout: 5000 });
            const mediaItems = await page.$$eval('#boardContents ul li', (items) => 
                items.map(item => {
                    const link = item.querySelector('a');
                    const date = item.querySelector('.date')?.textContent.trim();
                    const text = link?.textContent.trim();
                    const url = link?.href;
                    return { targetDate: date, type: '기사', text, url, issuer: null };
                })
            );
            synthesizedData.언론 = mediaItems;
        } catch (e) {
            console.log('Could not parse Media tab:', e.message);
        }
        
        try {
            await page.click('a[href="#tab_con04"]');
            await page.waitForSelector('#boardContentsYTB ul li', { state: 'visible', timeout: 5000 });
            const magazineItems = await page.$$eval('#boardContentsYTB ul li', (items) => 
                items.map(item => {
                    const link = item.querySelector('a');
                    const date = item.querySelector('.date')?.textContent.trim();
                    const text = link?.textContent.trim();
                    const url = link?.href;
                    return { targetDate: date, type: '건강매거진', text, url, issuer: null };
                })
            );
            synthesizedData.언론.push(...magazineItems);
        } catch (e) {
            console.log('Could not parse Health Magazine tab:', e.message);
        }

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

parse();