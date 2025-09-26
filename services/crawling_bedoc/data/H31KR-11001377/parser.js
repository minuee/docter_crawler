
const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const url = process.argv[2];
    const doctorName = process.argv[3];

    if (!url || !doctorName) {
        console.error('Please provide a URL and doctor name as arguments.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const html = await page.content();
        const $ = cheerio.load(html);

        const synthesizedData = { 학력: [], 경력: [], 학술: [], specialty: null, profileUrl: null, isAttend: false };

        let targetTab = null;
        $('.tab-content .tab-pane').each((i, pane) => {
            const name = $(pane).find('p.name').text().trim();
            if (name.includes(doctorName)) {
                targetTab = $(pane);
                return false; // break loop
            }
        });

        if (targetTab) {
            synthesizedData.isAttend = true;

            // 프로필 이미지
            const profileImgSrc = targetTab.find('.col-md-3 img').attr('src');
            if (profileImgSrc) {
                synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
            }

            // 학력, 경력, 학술활동
            targetTab.find('.content_text p').each((i, p) => {
                const text = $(p).text().trim();
                if (!text || $(p).hasClass('name') || $(p).hasClass('text2') || $(p).hasClass('text4')) return;

                if (text.includes('졸업') || text.includes('박사') || text.includes('석사')) {
                    synthesizedData.학력.push({ date: null, content: text });
                } else if (text.includes('회원') || text.includes('위원') || text.includes('회장') || text.includes('부회장')) {
                     synthesizedData.학술.push({ date: null, content: text });
                } else {
                    synthesizedData.경력.push({ date: null, content: text });
                }
            });

        }

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error(`An error occurred: ${e.message}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
