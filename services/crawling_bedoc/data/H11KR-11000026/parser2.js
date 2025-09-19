
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [
  bedoc_doctorname,
  bedoc_deptname,
  hospital_site,
  site_type,
  aiga_hid,
  json_file_path
] = process.argv.slice(2);

const url = hospital_site;

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let originalData = {};
    try {
        originalData = JSON.parse(fs.readFileSync(json_file_path, 'utf-8'));
    } catch (e) {
        console.log(JSON.stringify({ success: false, error: `Failed to read original data file: ${e.message}` }, null, 2));
        return;
    }

    try {
        // 1. Go to the page and wait for the initial DOM to be ready.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 2. CRUCIAL STEP: Wait for the dynamic content (career info) to be loaded by JavaScript.
        await page.waitForSelector('div#_careerContainer td[data-key="careerSj"]', { state: 'attached', timeout: 15000 });

        // 3. Now that content is loaded, extract everything.
        const profileUrl = await page.locator('.doc_img').getAttribute('src').catch(() => null);
        const specialty = await page.locator('.subj_t').textContent().catch(() => null);

        const careerItems = await page.locator('div#_careerContainer td[data-key="careerSj"]').allTextContents();
        const education = careerItems.filter(item => item.includes('학사') || item.includes('석사') || item.includes('박사') || item.includes('졸업')).map(c => ({ date: null, content: c.trim() }));
        const experience = careerItems.filter(item => !education.some(edu => edu.content === item.trim())).map(c => ({ date: null, content: c.trim() }));

        const academicItems = await page.locator('div._careerContainer:has(h3:has-text("학회활동")) td[data-key="careerSj"]').allTextContents();
        const academic = academicItems.map(item => ({ date: null, content: item.trim() }));

        const synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : null,
            specialty: specialty ? specialty.trim() : null,
            '학력': education,
            '경력': experience,
            '학술': academic,
        };

        const papers = new Set();
        try {
            const moreButton = page.locator('button#_toggleThesis');
            if (await moreButton.count() > 0) {
                await moreButton.click();
                await page.waitForSelector('ul#_thesisContainer li', { state: 'attached', timeout: 10000 });
                await page.waitForTimeout(1000); // Extra wait

                const paperTitles = await page.locator('ul#_thesisContainer span[data-key="thesisNm"]').allTextContents();
                paperTitles.forEach(t => papers.add(t.trim()));
            }
            synthesizedData['논문'] = Array.from(papers);
        } catch (e) {
            synthesizedData.paper_error = e.message;
            synthesizedData['논문'] = [];
        }

        const bodyText = await page.textContent('body');
        const isAttend = bodyText.includes(bedoc_doctorname);

        const finalData = { ...originalData, ...synthesizedData, isAttend };

        const hasNewData = education.length > 0 || experience.length > 0 || papers.size > 0;
        if (hasNewData) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
            delete finalData.error;
            delete finalData.paper_error;
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
            finalData.error = 'Playwright parser could not extract any new data.';
        }
        
        fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2));
        console.log(JSON.stringify({ success: true, message: `Successfully updated ${path.basename(json_file_path)}` }, null, 2));

    } catch (e) {
        const finalData = { ...originalData };
        finalData.isExist = false;
        finalData.isSearchType = 'html_playwright_failed';
        finalData.error = `Execution Error: ${e.message}`;
        fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2));
        console.log(JSON.stringify({ success: false, error: e.message }, null, 2));
    } finally {
        await browser.close();
    }
}

parse();
