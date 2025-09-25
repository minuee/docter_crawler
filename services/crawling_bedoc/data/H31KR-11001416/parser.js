const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const jsonPath = process.argv[2];
    if (!jsonPath) {
        console.error('Please provide a path to the JSON file as an argument.');
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
        console.error('Failed to read or parse the JSON file.');
        process.exit(1);
    }

    const { hospital_site } = doctorData;

    if (!hospital_site) {
        console.error('hospital_site not found in the JSON file.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let success = false;

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded' });

        const profileUrl = await page.locator('.col-xs-12.text-center .img-responsive').getAttribute('src');
        synthesizedData.profileUrl = profileUrl ? new URL(profileUrl, hospital_site).href : null;

        const specialty = await page.locator('.col-md-8 p.font-pretendard').textContent();
        synthesizedData.specialty = specialty ? specialty.trim().replace(/"/g, '') : null;

        const historySections = await page.locator('.row.m-t-30 .col-md-6.col-sm-12.col-xs-12').all();

        for (const section of historySections) {
            const title = await section.locator('h5').textContent();
            const items = await section.locator('ul.history-list li').allTextContents();

            const formattedItems = items.map(item => ({ date: null, content: item.trim().replace(/"/g, '') }));

            if (title.includes('학력')) {
                synthesizedData.학력 = formattedItems;
            } else if (title.includes('경력')) {
                synthesizedData.경력 = formattedItems;
            } else if (title.includes('자격')) {
                if (!synthesizedData.경력) synthesizedData.경력 = [];
                synthesizedData.경력.push(...formattedItems);
            }
        }
        
        success = true;

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        synthesizedData.error = e.message;
    } finally {
        await browser.close();

        const originalDoctorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const finalData = { ...originalDoctorData, ...synthesizedData };

        if (success && (finalData.학력?.length > 0 || finalData.경력?.length > 0)) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
            delete finalData.error;
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
        }
        
        fs.writeFileSync(jsonPath, JSON.stringify(finalData, null, 2));
        console.log(`File updated: ${jsonPath}`);
    }
})();