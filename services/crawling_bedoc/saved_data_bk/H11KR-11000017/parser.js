
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

        const doctorContainer = page.locator('div.pb-15.mb-15', { has: page.locator(`h3:has-text('${bedoc_doctorname}')`) });

        if (await doctorContainer.count() === 0) {
            throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
        }

        // Click the details button
        const detailsButton = doctorContainer.locator('button.dropdown__button:has-text("이력사항 펼쳐보기")');
        if (await detailsButton.count() > 0) {
            await detailsButton.click();
            await page.waitForTimeout(500); // Wait for animation
        }

        const dropdownMenu = doctorContainer.locator('div.dropdown__menu');

        const getItems = async (title) => {
            const header = dropdownMenu.locator(`h4:has-text('${title}')`);
            if (await header.count() > 0) {
                const items = await header.locator('xpath=following-sibling::ul[1]/li').allTextContents();
                return items.map(item => item.trim());
            }
            return [];
        };

        const profileUrl = await doctorContainer.locator('img.media-image').getAttribute('src');
        const specialty = await doctorContainer.locator('h3 span.text-orange').textContent();

        const educationItems = await getItems('학력');
        const experienceItems = await getItems('경력');
        const researchItems = await getItems('연구 및 업적');
        const bookAndPaperItems = await getItems('저서 및 논문');

        const education = educationItems.map(c => ({ date: null, content: c.replace(/"/g, "") }));
        const experience = experienceItems.map(c => ({ date: null, content: c.replace(/"/g, "") }));
        const awards = researchItems.map(c => ({ date: null, content: c.replace(/"/g, "") }));
        const books = bookAndPaperItems.map(c => ({ date: null, content: c.replace(/"/g, "") }));

        const synthesizedData = {
            profileUrl: profileUrl ? new URL(profileUrl, url).href : null,
            specialty: specialty ? specialty.trim() : null,
            '학력': education,
            '경력': experience,
            '수상': awards,
            '저서': books,
        };

        const bodyText = await page.textContent('body');
        const isAttend = bodyText.includes(bedoc_doctorname);

        const finalData = { ...originalData, ...synthesizedData, isAttend };

        // Clear out the old incorrect data
        finalData.education = [];
        finalData.experience = [];

        const hasNewData = education.length > 0 || experience.length > 0 || awards.length > 0 || books.length > 0;

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
