
const { chromium } = require('playwright');

const url = process.argv[2];

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        // --- Working parts from old parser (with corrected selectors) ---
        const profileUrl = await page.locator('.doc_img').getAttribute('src').catch(() => null);
        const specialty = await page.locator('.subj_t').textContent().catch(() => null);

        const careerItems = await page.locator('div#_careerContainer td[data-key="careerSj"]').allTextContents();
        const education = careerItems.filter(item => item.includes('학사') || item.includes('석사') || item.includes('박사') || item.includes('졸업')).map(c => ({ date: null, content: c.trim() }));
        const experience = careerItems.filter(item => !education.some(edu => edu.content === item.trim())).map(c => ({ date: null, content: c.trim() }));

        // --- Fix for 학술 (Academic Activities) ---
        const academicItems = await page.locator('div._careerContainer:has(h3:has-text("학회활동")) td[data-key="careerSj"]').allTextContents();
        const academic = academicItems.map(item => ({ date: null, content: item.trim() }));

        // --- Fix for 논문 (Papers) ---
        const papers = [];
        try {
            const moreButton = page.locator('button#_toggleThesis');
            await moreButton.click();
            await page.waitForSelector('ul#_thesisContainer li', { state: 'visible', timeout: 5000 });
            const paperTitles = await page.locator('ul#_thesisContainer span[data-key="thesisNm"]').allTextContents();
            papers.push(...paperTitles.map(t => t.trim()));
        } catch (e) {
            console.error(`Could not scrape papers: ${e.message}`);
        }

        synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : null,
            specialty: specialty ? specialty.trim() : null,
            '학력': education,
            '경력': experience,
            '학술': academic,
            '논문': papers,
        };

    } catch (e) {
        synthesizedData.error = e.message;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(synthesizedData, null, 2));
}

parse();
