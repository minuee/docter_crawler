
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

        // Since it's a list page with popups, we don't need to click.
        // The detail content is already in the HTML.
        const popup = page.locator('.popup', { has: page.locator(`h4:has-text('${bedoc_doctorname}')`) });

        if (await popup.count() === 0) {
            throw new Error(`Popup for doctor ${bedoc_doctorname} not found.`);
        }

        const profileUrl = await popup.locator('.profile-top .img img').getAttribute('src');
        const specialty = await popup.locator('.profile-top .txt p.part').textContent();

        const getDlItems = async (title) => {
            const dl = popup.locator('dl', { has: popup.locator(`dt:has-text('${title}')`) });
            if (await dl.count() > 0) {
                const items = await dl.locator('dd').allTextContents();
                return items.map(item => item.trim().replace(/·/g, '').trim());
            }
            return [];
        };

        const educationItems = await getDlItems('학력');
        const experienceItems = await getDlItems('경력');
        const paperItems = await getDlItems('국제(국내)학회발표');

        const education = educationItems.map(c => ({ date: null, content: c.replace(/"/g, "") }));
        const experience = experienceItems.map(c => ({ date: null, content: c.replace(/"/g, "") }));
        const papers = paperItems.map(c => c.replace(/"/g, ""));

        const synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : null,
            specialty: specialty ? specialty.trim() : null,
            '학력': education,
            '경력': experience,
            '논문': papers,
        };

        const bodyText = await page.textContent('body');
        const isAttend = bodyText.includes(bedoc_doctorname);

        const finalData = { ...originalData, ...synthesizedData, isAttend };

        const hasNewData = education.length > 0 || experience.length > 0 || papers.length > 0;

        if (hasNewData) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
            finalData.error = null;
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
            finalData.error = 'Playwright parser could not extract new data.';
        }

        fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2));
        console.log(JSON.stringify({ success: true, message: `Successfully created and updated ${path.basename(json_file_path)}` }, null, 2));
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
