
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

        synthesizedData.profileUrl = new URL($('article.profile .pic img').attr('src'), url).href;
        synthesizedData.specialty = $('div.part_txt p[title]').attr('title');

        // 학력
        $('#tab_con01 table td p').each((i, el) => {
            const content = $(el).text().trim();
            if (content) {
                synthesizedData.학력.push({ date: null, content });
            }
        });

        // 경력
        $('#tab_con02 table td p').each((i, el) => {
            const date = $(el).find('span').first().text().trim();
            const content = $(el).find('span').last().text().trim();
            if (content) {
                synthesizedData.경력.push({ date: date || null, content });
            }
        });

        // 학회활동
        $('#tab_con03 table td p').each((i, el) => {
            const date = $(el).find('span').first().text().trim();
            const content = $(el).find('span').last().text().trim();
            if (content) {
                synthesizedData.학술.push({ date: date || null, content });
            }
        });

        // 논문/저서
        const publicationsHtml = $('#tab_con05 table td').html();
        if (publicationsHtml) {
            const lines = publicationsHtml.split('<br>').map(l => cheerio.load(l).text().trim()).filter(l => l);
            lines.forEach(line => {
                if (line) {
                    synthesizedData.논문.push(line.replace(/^\d+\.\s*/, ''));
                }
            });
        }

        // 언론보도
        try {
            await page.click('a[href="#tab_con06"]');
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

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

parse();
