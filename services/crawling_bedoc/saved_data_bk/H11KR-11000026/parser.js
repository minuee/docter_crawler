
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

    let synthesizedData = {};

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.doc_img', { state: 'visible', timeout: 15000 });

        const profileUrl = await page.locator('.doc_img').getAttribute('src').catch(() => null);
        const specialty = await page.locator('.subj_t').textContent().catch(() => null);

        const careerItems = await page.locator('div#_careerContainer td[data-key="careerSj"]').allTextContents();
        const education = careerItems.filter(item => item.includes('학사') || item.includes('석사') || item.includes('박사') || item.includes('졸업')).map(c => ({ date: null, content: c.trim() }));
        const experience = careerItems.filter(item => !education.some(edu => edu.content === item.trim())).map(c => ({ date: null, content: c.trim() }));

        const academicItems = await page.locator('div._careerContainer:has(h3:has-text("학회활동")) td[data-key="careerSj"]').allTextContents();
        const academic = academicItems.map(item => ({ date: null, content: item.trim() }));

        synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : null,
            specialty: specialty ? specialty.trim() : null,
            '학력': education,
            '경력': experience,
            '학술': academic,
        };

        const papers = new Set();
        try {
            const moreButton = page.locator('button#_toggleThesis');
            await moreButton.click();
            await page.waitForSelector('ul#_thesisContainer li', { state: 'visible', timeout: 5000 });

            const pageInfo = await page.locator('#_thesisMobilePaging').textContent({ timeout: 2000 });
            const totalPages = parseInt(pageInfo.split('/')[1].trim(), 10);

            if (isNaN(totalPages)) {
                throw new Error("Could not determine total pages for papers.");
            }

            for (let i = 0; i < totalPages; i++) {
                const firstPaperOnPage = await page.locator('ul#_thesisContainer span[data-key="thesisNm"]').first().textContent();

                const paperTitles = await page.locator('ul#_thesisContainer span[data-key="thesisNm"]').allTextContents();
                paperTitles.forEach(t => papers.add(t.trim()));

                if (i < totalPages - 1) {
                    await page.locator('a.next[data-thesispaging="next"]').click();
                    
                    await page.waitForTimeout(2000);
                }
            }
            synthesizedData['논문'] = Array.from(papers);
            delete synthesizedData.paper_error;
        } catch (e) {
            synthesizedData.paper_error = e.message;
            if (papers.size > 0) {
                synthesizedData['논문'] = Array.from(papers);
            } else {
                synthesizedData['논문'] = [];
            }
        }

        const bodyText = await page.textContent('body');
        const isAttend = bodyText.includes(bedoc_doctorname);

        const finalData = { ...originalData, ...synthesizedData, isAttend };

        const hasNewData = education.length > 0 || experience.length > 0 || papers.length > 0;
        if (hasNewData) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
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
        finalData.error = e.message;
        fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2));
        console.log(JSON.stringify({ success: false, error: e.message }, null, 2));
    } finally {
        await browser.close();
    }
}

parse();
