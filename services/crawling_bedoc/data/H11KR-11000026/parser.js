
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [
  bedoc_doctorname,
  bedoc_deptname,
  hospital_site,
  site_type,
  json_file_path,
  aiga_hid
] = process.argv.slice(2);

const url = hospital_site;

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let originalData = {};
    try {
        originalData = JSON.parse(fs.readFileSync(json_file_path, 'utf-8'));
    } catch (e) {
        console.error(`Failed to read original data file: ${e.message}`);
        process.exit(1);
    }

    const mainTask = async () => {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        const profileUrl = await page.locator('.doc_img').getAttribute('src').catch(() => null);
        const specialty = await page.locator('.subj_t').textContent().catch(() => null);

        // Scroll to the career container to make sure it's visible
        await page.locator('#_careerContainer').scrollIntoViewIfNeeded().catch(() => {});

        let experienceItems = [];
        let academicItems = [];

        const careerContainers = await page.locator('#_careerContainer > div._careerContainer').all();

        for (const container of careerContainers) {
            const title = await container.locator('h3.cont_tit').textContent();
            const items = await container.locator('td[data-key="careerSj"]').allTextContents();

            if (title.includes('경력')) {
                experienceItems.push(...items.map(item => item.trim()));
            } else if (title.includes('학회활동')) {
                academicItems.push(...items.map(item => item.trim()));
            }
        }

        const education = experienceItems.filter(item => item.includes('학사') || item.includes('석사') || item.includes('박사') || item.includes('졸업')).map(c => ({ date: null, content: c.replace(/"/g, "") }));
        const experience = experienceItems.filter(item => !education.some(edu => edu.content === item.replace(/"/g, ""))).map(c => ({ date: null, content: c.replace(/"/g, "") }));
        const academic = academicItems.map(item => ({ date: null, content: item.replace(/"/g, "") }));

        // User confirmed paper logic is OK, so we don't touch it.
        const papers = new Set(originalData['논문'] || []);

        const synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : originalData.profileUrl,
            specialty: specialty ? specialty.trim() : originalData.specialty,
            '학력': education,
            '경력': experience,
            '학술': academic,
            '논문': Array.from(papers)
        };

        const bodyText = await page.textContent('body');
        const isAttend = bodyText.includes(bedoc_doctorname);

        const finalData = { ...originalData, ...synthesizedData, isAttend };

        const hasNewData = education.length > 0 || experience.length > 0 || academic.length > 0;

        if (hasNewData) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
            finalData.error = null;
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
            finalData.error = 'Playwright parser could not extract new career/education data.';
        }

        fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2));
        console.log(JSON.stringify({ success: true, data: { education, experience, academic } }, null, 2));
    };

    try {
        await Promise.race([
            mainTask(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Global timeout of 2 minutes reached')), 120000))
        ]);
    } catch (e) {
        const finalData = { ...originalData, isExist: false, isSearchType: 'html_playwright_failed', error: e.message };
        fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2));
        console.error(JSON.stringify({ success: false, error: e.message }, null, 2));
    } finally {
        await browser.close();
    }
}

parse();
