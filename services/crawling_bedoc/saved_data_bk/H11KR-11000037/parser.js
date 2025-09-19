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

        const doctorContainer = page.locator('div.medical_schedule_con_area', { hasText: bedoc_doctorname });

        // --- Extract from "주요약력" tab ---
        const profileLink = doctorContainer.locator('a:has-text("주요약력")');
        await profileLink.click();
        await page.waitForTimeout(1000);

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

        // --- Extract from "수상경력·논문" tab ---
        const awardsTab = doctorContainer.locator('a:has-text("수상경력·논문")');
        await awardsTab.click();
        await page.waitForTimeout(1000);

        const awardsAndPapersContainer = doctorContainer.locator('.schedule_tab_con.on');
        
        const awards = [];
        const papers = [];

        let isAwardSection = false;
        const allElements = await awardsAndPapersContainer.locator('.profile_list > *').all();

        for (const element of allElements) {
            const tagName = await element.evaluate(node => node.tagName);
            const text = (await element.textContent())?.trim();

            if (tagName === 'B' && text === '수상내역') {
                isAwardSection = true;
                continue;
            }

            if (tagName === 'LI' && text) {
                if (isAwardSection) {
                    awards.push({ date: null, content: text });
                } else {
                    papers.push(text);
                }
            }
        }


        synthesizedData = {
            specialty: specialty ? specialty.replace(/\s+/g, ' ').trim() : null,
            '학력': education,
            '경력': experience,
            '학술': academic,
            '수상': awards,
            '논문': papers
        };

    } catch (e) {
        synthesizedData.error = e.message;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(synthesizedData, null, 2));
}

parse();