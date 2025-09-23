const { chromium } = require('playwright');
const fs = require('fs');

const url = process.argv[2];

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        const profileUrl = await page.locator('div.doctor_top div.photo img').getAttribute('src').catch(() => null);
        const specialty = await page.locator('div.doctor_info dl.tit dd').textContent().catch(() => null);

        const education = [];
        const experience = [];

        const careerItems = await page.locator('div.detail_info02 ul li').allTextContents();
        careerItems.forEach(item => {
            const content = item.trim();
            if (content.includes('연수')) {
                education.push({ date: null, content: content });
            } else {
                experience.push({ date: null, content: content });
            }
        });

        const academicItems = await page.locator('div.detail_info03 ul li').allTextContents();
        const academic = academicItems.map(item => ({ date: null, content: item.trim() }));

        synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : null,
            specialty: specialty ? specialty.trim() : null,
            '학력': education,
            '경력': experience,
            '학술': academic,
            '논문': [],
            '저서': [],
        };

    } catch (e) {
        synthesizedData.error = e.message;
    } finally {
        await browser.close();
    }

    fs.writeFileSync('/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/services/crawling_bedoc/data/H11KR-38000020/temp_output.json', JSON.stringify(synthesizedData, null, 2));
}

parse();