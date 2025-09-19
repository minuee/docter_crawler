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

    const { bedoc_doctorname, hospital_site } = doctorData;

    if (!hospital_site) {
        console.error('hospital_site not found in the JSON file.');
        process.exit(1);
    }

    console.log(`Navigating to ${hospital_site} for doctor ${bedoc_doctorname}...`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let success = false;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // Use the parent container that holds both image and text info
        const doctorContainer = page.locator('div.medical_schedule_list', { hasText: bedoc_doctorname });
        
        if (await doctorContainer.count() === 0) {
            throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
        }

        // --- Extract from the correct sub-containers ---
        const contentArea = doctorContainer.locator('.medical_schedule_con_area');

        const profileImgSrc = await doctorContainer.locator('.pic_area img').getAttribute('src');
        synthesizedData.profileUrl = profileImgSrc ? new URL(profileImgSrc, hospital_site).href : null;

        const specialty = await contentArea.locator('dl.professional dd').textContent();

        // --- Handle tabs ---
        const profileLink = contentArea.locator('a:has-text("주요약력")');
        await profileLink.click();
        await page.waitForTimeout(1000);

        // The content is inside a tab panel that becomes visible
        const profileItems = await contentArea.locator('.schedule_tab_con_area .schedule_tab_con.on .profile_list li').allTextContents();

        const education = [];
        const experience = [];
        const academic = [];

        profileItems.forEach(item => {
            const content = item.trim().replace(/"/g, '');
            if (!content) return;

            if (content.includes('학사') || content.includes('석사') || content.includes('박사') || content.includes('졸업') || content.includes('수료')) {
                education.push({ date: null, content: content });
            } else if (content.includes('학회') || content.includes('회원') || content.includes('회장')) {
                academic.push({ date: null, content: content });
            } else {
                experience.push({ date: null, content: content });
            }
        });

        const awardsTab = contentArea.locator('a:has-text("수상경력·논문")');
        if (await awardsTab.count() > 0 && await awardsTab.isVisible()) {
            console.log('Clicking "수상경력·논문" tab...');
            await awardsTab.click();
            await page.waitForTimeout(1000);

            const awardsAndPapersContainer = contentArea.locator('.schedule_tab_con_area .schedule_tab_con.on');
            
            const awards = [];
            const papers = [];
            let isAwardSection = false;
            
            const allElements = await awardsAndPapersContainer.locator('.profile_list > *').all();

            for (const element of allElements) {
                const tagName = await element.evaluate(node => node.tagName);
                const text = (await element.textContent())?.trim().replace(/"/g, '');

                if (tagName === 'B' && text === '수상내역') {
                    isAwardSection = true;
                    continue;
                }

                if (tagName === 'LI' && text) {
                    if (isAwardSection) {
                        awards.push({ date: null, content: text });
                    } else {
                        papers.push(text);
                    }
                }
            }
            synthesizedData.수상 = awards;
            synthesizedData.논문 = papers;
        }

        synthesizedData.specialty = specialty ? specialty.replace(/\s+/g, ' ').trim().replace(/"/g, '') : null;
        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;
        synthesizedData.학술 = academic;
        
        success = true;
        console.log('--- PARSED DATA ---');
        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        synthesizedData.error = e.message;
    } finally {
        await browser.close();

        const finalData = { ...doctorData, ...synthesizedData };
        if (success && (finalData.학력.length > 0 || finalData.경력.length > 0)) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
        }
        
        fs.writeFileSync(jsonPath, JSON.stringify(finalData, null, 2));
        console.log(`File updated: ${jsonPath}`);
    }
})();