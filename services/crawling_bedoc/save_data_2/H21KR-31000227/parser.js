const { chromium } = require('playwright');

// 이 파서는 동탄제일병원(dongtanjeil.kr) 사이트 구조에 특화되어 있습니다.
async function parse(url) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });

        // Scroll to the bottom of the page to trigger lazy loading
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(2000); // Give time for content to load

        // Loop to click "More" buttons for pagination (if any)
        while (true) {
            const moreButton = page.locator('a:text("더보기"), button:text("더보기"), a:text("more"), button:text("more")').first();
            const isVisible = await moreButton.isVisible().catch(() => false);
            if (isVisible) {
                await moreButton.click({force: true}).catch(() => {});
                await page.waitForTimeout(1500); 
            } else {
                break;
            }
        }

        const data = await page.evaluate(() => {
            const getText = (selector) => document.querySelector(selector)?.innerText.trim().replace(/"/g, '') || '';
            const getList = (selector) => Array.from(document.querySelectorAll(selector))
                                     .map(el => el.innerText.trim().replace(/"/g, ''))
                                     .filter(item => item);

            // Assuming doctor name and department are in a specific section
            const doctorNameEl = document.querySelector('.doctor-name-selector'); // Placeholder selector
            const deptNameEl = document.querySelector('.department-name-selector'); // Placeholder selector

            const specialty = getText('.specialty-selector'); // Placeholder selector
            const education = getList('.education-selector li'); // Placeholder selector
            const experience = getList('.experience-selector li'); // Placeholder selector
            const publications = getList('.publications-selector li'); // Placeholder selector
            const academicActivities = getList('.academic-activities-selector li'); // Placeholder selector

            let profileUrl = document.querySelector('.profile-image-selector')?.src || ''; // Placeholder selector

            return {
                specialty,
                학력: education.map(item => ({ content: item })),
                경력: experience.map(item => ({ content: item })),
                논문: publications,
                학술: academicActivities.map(item => ({ content: item })),
                profileUrl,
            };
        });

        await browser.close();
        return { success: true, data };

    } catch (error) {
        await browser.close();
        console.error(`Error in dongtanjeil.kr parser: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// 이 파일이 직접 실행될 경우를 위한 로직
if (require.main === module) {
    (async () => {
        const url = process.argv[2];
        if (!url) {
            console.error('Please provide a URL as an argument.');
            process.exit(1);
        }
        const result = await parse(url);
        if (result.success) {
            console.log(JSON.stringify(result.data, null, 2));
        }
    })();
}

module.exports = { parse };