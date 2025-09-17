const { chromium } = require('playwright');

const direct_url = process.argv[2];

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(direct_url, { waitUntil: 'networkidle', timeout: 60000 });

        const profileUrl = await page.locator('div.profile_topImg img').getAttribute('src').catch(() => null);
        const specialty = await page.locator('div.special_explain').textContent().catch(() => null);

        const education = [];
        const experience = [];
        const academic = [];
        const awards = [];
        const papers = [];

        // Professor Experience
        const profExpItems = await page.locator('p.curri_title:has-text("교수 경력") + ul.dot_list li').allTextContents();
        profExpItems.forEach(item => experience.push({ date: null, content: item.trim() }));

        // Clinical Experience
        const clinicalExpItems = await page.locator('p.curri_title:has-text("진료 경력") + ul.dot_list li').allTextContents();
        clinicalExpItems.forEach(item => experience.push({ date: null, content: item.trim() }));

        // Academic/Awards/etc.
        const academicItems = await page.locator('p.curri_title:has-text("학회·연구·연수·수상 경력") + ul.dot_list li').allTextContents();
        academicItems.forEach(item => {
            const content = item.trim();
            if (content.includes('상') || content.includes('과제')) {
                awards.push({ date: null, content: content });
            } else {
                academic.push({ date: null, content: content });
            }
        });

        // Papers
        const paperItems = await page.locator('div#paper ol.thesisList li').allTextContents();
        paperItems.forEach(item => papers.push(item.trim()));

        synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, direct_url).href : null,
            specialty: specialty ? specialty.replace(/\s+/g, ' ').trim() : null,
            '학력': education, // No explicit education section found in this structure
            '경력': experience,
            '학술': academic,
            '수상': awards,
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