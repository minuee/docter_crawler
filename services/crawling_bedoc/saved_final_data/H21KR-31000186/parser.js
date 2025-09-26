const { chromium } = require('playwright');

const direct_url = process.argv[2];

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(direct_url, { waitUntil: 'networkidle', timeout: 60000 });

        const profileUrl = await page.locator('div.drHeader figure img').getAttribute('src').catch(() => null);

        const profileItems = await page.locator('div.career.brief dd.expltxt').allTextContents();
        
        const education = [];
        const experience = [];
        const academic = [];
        const awards = [];

        profileItems.forEach(item => {
            const content = item.trim();
            if (!content) return;

            if (content.includes('졸업') || content.includes('석사') || content.includes('박사') || content.includes('수료') || content.includes('연수')) {
                education.push({ date: null, content: content });
            } else if (content.includes('상')) {
                awards.push({ date: null, content: content });
            } else if (content.includes('학회')) {
                academic.push({ date: null, content: content });
            } else {
                experience.push({ date: null, content: content });
            }
        });

        const papers = await page.locator('div.career:has(h5:has-text("게재")) ul li').allTextContents();
        const books = await page.locator('div.career:has(h5:has-text("저서")) div.wr-content5').allTextContents();

        synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, direct_url).href : null,
            '학력': education,
            '경력': experience,
            '학술': academic,
            '수상': awards,
            '논문': papers.map(p => p.trim()),
            '저서': books.map(b => b.trim()),
        };

    } catch (e) {
        synthesizedData.error = e.message;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(synthesizedData, null, 2));
}

parse();