
const { chromium } = require('playwright');

// Arguments from command line
const bedoc_doctorname = process.argv[2];
const hospital_site = process.argv[3];

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // Step 1: Locate the specific doctor's container on the list page.
        const doctorContainer = page.locator('div.medical_schedule_con_area', { hasText: bedoc_doctorname });

        // Step 2: Click the "주요약력" link within that container to reveal the info.
        const profileLink = doctorContainer.locator('a:has-text("주요약력")');
        await profileLink.click();
        await page.waitForTimeout(1000); // Wait for the content to become visible.

        // Step 3: Extract the data from within the same container.
        const specialty = await doctorContainer.locator('dl.professional dd').textContent();

        const profileItems = await doctorContainer.locator('.profile_list li').allTextContents();

        const education = [];
        const experience = [];
        const academic = [];

        profileItems.forEach(item => {
            const content = item.trim();
            if (!content) return;

            if (content.includes('학사') || content.includes('석사') || content.includes('박사') || content.includes('졸업') || content.includes('수료')) {
                education.push({ date: null, content: content });
            } else if (content.includes('학회') || content.includes('회원') || content.includes('회장')) {
                academic.push({ date: null, content: content });
            } else {
                experience.push({ date: null, content: content });
            }
        });

        synthesizedData = {
            specialty: specialty ? specialty.replace(/\s+/g, ' ').trim() : null,
            '학력': education,
            '경력': experience,
            '학술': academic,
        };

    } catch (e) {
        synthesizedData.error = e.message;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(synthesizedData, null, 2));
}

parse();
