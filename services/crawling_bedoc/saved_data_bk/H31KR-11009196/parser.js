
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

        const doctorDiv = page.locator('div.doc', { has: page.locator(`div.doctor:has-text('${bedoc_doctorname}')`) });

        if (await doctorDiv.count() === 0) {
            throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
        }

        const profileUrl = await doctorDiv.locator('div.thum img').getAttribute('src');
        const specialty = await doctorDiv.locator('div.category').textContent();
        
        const historyItems = await doctorDiv.locator('ul.history li').allTextContents();

        const education = [];
        const experience = [];
        const academic = [];
        const books = [];

        historyItems.forEach(itemText => {
            const text = itemText.trim();
            if (text.includes('저자')) {
                books.push({ date: null, content: text.replace(/"/g, "") });
            } else if (text.includes('회원')) {
                academic.push({ date: null, content: text.replace(/"/g, "") });
            } else if (text.includes('교수') || text.includes('전문의') || text.includes('fellowship')) {
                experience.push({ date: null, content: text.replace(/"/g, "") });
            } else {
                experience.push({ date: null, content: text.replace(/"/g, "") }); // Default to experience
            }
        });

        const synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : null,
            specialty: specialty ? specialty.trim() : null,
            '학력': education,
            '경력': experience,
            '학술': academic,
            '저서': books,
        };

        const bodyText = await page.textContent('body');
        const isAttend = bodyText.includes(bedoc_doctorname);

        const finalData = { ...originalData, ...synthesizedData, isAttend };

        const hasNewData = education.length > 0 || experience.length > 0 || academic.length > 0 || books.length > 0;

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
