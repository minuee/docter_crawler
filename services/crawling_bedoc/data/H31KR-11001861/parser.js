const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/"/g, "''").trim() : '';
};

async function parseDoctorProfile(doctorData) {
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let synthesizedData = {};
    let isAttend = false;
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Check attendance
        const nameLocator = page.locator(`.doctor-con .info .name:has-text("${bedoc_doctorname}")`);
        if (await nameLocator.count() > 0) {
            isAttend = true;
        }

        // Scrape Profile URL
        const profileUrl = await page.locator('div.doctor-con .img img').getAttribute('src');
        if (profileUrl) {
            synthesizedData.profileUrl = new URL(profileUrl, hospital_site).href;
        }

        // Scrape Specialty
        synthesizedData.specialty = await page.locator('div.info dl:has-text("주관심분야") dd').innerText();

        // Scrape sections
        const sections = await page.locator('.doctor-detail > h4').all();
        for (const sectionTitle of sections) {
            const title = await sectionTitle.innerText();
            const listItems = await sectionTitle.locator('+ ul.dot-list > li').allInnerTexts();
            const content = listItems.join('\n');
            const items = content.split(/\r?\n/).map(s => cleanText(s)).filter(Boolean);

            if (title.includes('약력')) {
                synthesizedData.경력 = items.map(i => ({ date: null, content: i }));
            } else if (title.includes('학회')) {
                synthesizedData.학술 = items.map(i => ({ date: null, content: i }));
            } else if (title.includes('수상')) {
                synthesizedData.수상 = items.map(i => ({ date: null, content: i }));
            } else if (title.includes('논문 및 저술')) {
                synthesizedData.논문 = items;
            }
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
    } finally {
        await browser.close();
    }

    // Final data preparation
    const finalResult = { ...synthesizedData, isAttend, error };
    Object.keys(finalResult).forEach(key => {
        const value = finalResult[key];
        if ((Array.isArray(value) && value.length === 0) || !value) {
            delete finalResult[key];
        }
    });

    return finalResult;
}

if (require.main === module) {
    const jsonFilePath = process.argv[2];
    if (!jsonFilePath) {
        console.error('Error: JSON file path is required.');
        process.exit(1);
    }

    let originalData;
    try {
        originalData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${jsonFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(originalData)
        .then(result => {
            const updatedData = { ...originalData, ...result };
            updatedData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedData.isExist = !result.error;
            if (!result.error) delete updatedData.error;

            fs.writeFileSync(jsonFilePath, JSON.stringify(updatedData, null, 2), 'utf-8');
            console.log(`Successfully processed and updated: ${path.basename(jsonFilePath)}`);
        })
        .catch(err => {
            console.error('A critical error occurred:', err);
            originalData.isSearchType = 'html_playwright_failed';
            originalData.error = err.message;
            fs.writeFileSync(jsonFilePath, JSON.stringify(originalData, null, 2), 'utf-8');
        });
}