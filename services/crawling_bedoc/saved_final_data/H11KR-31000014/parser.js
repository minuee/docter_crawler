
const { chromium } = require('playwright');

const url = process.argv[2];

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        const profileUrl = await page.locator('div.swiper-slide-active span img').getAttribute('src').catch(() => null);
        
        // Specialty text needs to be cleaned of the anchor tag text.
        const specialtyElement = page.locator('dl.txt:has(dt:has-text("진료분야")) p.p');
        const specialty = await specialtyElement.innerText().catch(() => null);

        const educationItems = await page.locator('div#doc_detailsBox_tab01 li span').allTextContents();
        const experienceItems = await page.locator('div#doc_detailsBox_tab02 li span').allTextContents();
        const academicItems = await page.locator('div#doc_detailsBox_tab03 li span').allTextContents();
        const paperItems = await page.locator('div#doc_detailsBox_tab05 li').allTextContents();

        // Remove duplicates by converting to a Set and back to an array.
        const education = [...new Set(educationItems)].map(item => ({ date: null, content: item.trim() }));
        const experience = [...new Set(experienceItems)].map(item => ({ date: null, content: item.trim() }));
        const academic = [...new Set(academicItems)].map(item => ({ date: null, content: item.trim() }));
        const papers = [...new Set(paperItems)].map(item => item.replace(/\s+/g, ' ').trim());

        synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : null,
            specialty: specialty ? specialty.split(',\n')[0].trim() : null, // Clean up the specialty text
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
