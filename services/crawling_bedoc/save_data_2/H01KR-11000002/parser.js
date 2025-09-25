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

        const profileUrl = await page.locator('div.thumb img').getAttribute('src');
        synthesizedData.profileUrl = profileUrl ? new URL(profileUrl, hospital_site).href : null;

        const specialty = await page.locator('div.name p').textContent();
        synthesizedData.specialty = specialty ? specialty.trim().replace(/"/g, '') : null;

        const sections = await page.locator('.cont-box .part').all();
        
        let education = [];
        let experience = [];
        let academic = [];
        let awards = [];

        for (const section of sections) {
            const title = await section.locator('.tit').textContent();
            const items = await section.locator('ul li').allTextContents();
            const formattedItems = items.map(item => {
                const parts = item.split('|').map(p => p.trim());
                const date = parts.length > 1 ? parts[0] : null;
                const content = (parts.length > 1 ? parts[1] : parts[0]).replace(/"/g, '');
                return { date, content };
            });

            if (title.includes('학력')) {
                education.push(...formattedItems);
            } else if (title.includes('경력')) {
                experience.push(...formattedItems);
            } else if (title.includes('학회활동')) {
                academic.push(...formattedItems);
            } else if (title.includes('수상경력')) {
                awards.push(...formattedItems);
            }
        }

        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;
        synthesizedData.학술 = academic;
        synthesizedData.수상 = awards;

        const paperTab = page.locator('a:has-text("논문")');
        if (await paperTab.count() > 0) {
            await paperTab.click();
            await page.waitForTimeout(1000); // wait for content to load
            const papers = await page.locator('.cont-box.paper-cont ul li').allTextContents();
            synthesizedData.논문 = papers.map(p => p.trim().replace(/"/g, ''));
        }

        const mediaTab = page.locator('a:has-text("언론보도")');
        if (await mediaTab.count() > 0) {
            await mediaTab.click();
            await page.waitForTimeout(1000);
            const mediaItems = await page.locator('.cont-box.media-cont ul li').all();
            const 언론 = [];
            for(const item of mediaItems) {
                const title = await item.locator('.tit').textContent();
                const source = await item.locator('.source').textContent();
                const date = await item.locator('.date').textContent();
                언론.push({
                    targetDate: date.trim(),
                    type: '기사',
                    text: title.trim().replace(/"/g, ''),
                    issuer: source.trim()
                });
            }
            synthesizedData.언론 = 언론;
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