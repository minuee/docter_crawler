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
        await page.goto(url, { waitUntil: 'networkidle' });
        const html = await page.content();
        const $ = cheerio.load(html);

        const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], 논문: [], 언론: [], 저서: [] };

        const profileImgSrc = $('.swiper_doc_detailImg .swiper-slide-active img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
        }

        synthesizedData.specialty = $("dt:contains('전문분야')").next('dd').text().trim().replace(/"/g, '');

        $('#doc_detailsBox_tab01 tbody tr').each((i, el) => {
            const content = $(el).find('td').eq(2).text().trim();
            if (content) {
                if (content.includes('졸업')) {
                    synthesizedData.학력.push({ date: null, content: content });
                } else {
                    const startDate = $(el).find('td').eq(0).text().trim();
                    const endDate = $(el).find('td').eq(1).text().trim();
                    let date = startDate;
                    if(endDate && endDate !== '현재') {
                        date = `${startDate} ~ ${endDate}`;
                    } else if (endDate === '현재') {
                         date = `${startDate} ~ 현재`;
                    }
                    synthesizedData.경력.push({ date: date || null, content: content });
                }
            }
        });

        $('#doc_detailsBox_tab02 tbody tr').each((i, el) => {
            const content = $(el).find('td').eq(2).text().trim();
            if (content) {
                 const startDate = $(el).find('td').eq(0).text().trim();
                 const endDate = $(el).find('td').eq(1).text().trim();
                 let date = startDate;
                 if(endDate && endDate !== '현재') {
                     date = `${startDate} ~ ${endDate}`;
                 } else if (endDate === '현재') {
                      date = `${startDate} ~ 현재`;
                 }
                synthesizedData.학술.push({ date: date || null, content: content });
            }
        });

        $('#doc_detailsBox_tab03 tbody tr').each((i, el) => {
            const year = $(el).find('td').eq(1).text().trim();
            const title = $(el).find('td').eq(2).text().trim();
            const journal = $(el).find('td').eq(3).text().trim();
            if (title) {
                synthesizedData.논문.push(`${title} (${journal}, ${year})`);
            }
        });

        $('#doc_detailsBox_tab05 tbody tr').each((i, el) => {
            const issuer = $(el).find('td').eq(0).text().trim();
            const text = $(el).find('td').eq(1).find('a').text().trim();
            const url = $(el).find('td').eq(1).find('a').attr('href');
            if (text) {
                synthesizedData.언론.push({ targetDate: null, type: '기사', text: text, url: url, issuer: issuer });
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
