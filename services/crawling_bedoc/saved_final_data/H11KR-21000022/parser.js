const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function parseDoctorProfile(doctorData) {
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let synthesizedData = {};
    let isAttend = false;
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded' });

        await page.click('a#tab02');
        await page.waitForSelector('#info_02 .doctor-list-area02', { state: 'visible', timeout: 10000 });

        const doctorLocator = page.locator('.doctor-list-box02', { hasText: bedoc_doctorname });
        const profileButton = doctorLocator.locator('a.btn_profile');

        if (await profileButton.count() > 0) {
            isAttend = true;
            await profileButton.click();

            const popupSelector = '#treatment_pop .layerpopup-doctor-profile-box';
            await page.waitForSelector(popupSelector, { state: 'visible', timeout: 10000 });
            const popup = page.locator(popupSelector);

            const profileImageLocator = popup.locator('img.image-layerpopup-doctor').first();
            const profileUrl = await profileImageLocator.getAttribute('src');
            if (profileUrl) {
                synthesizedData.profileUrl = new URL(profileUrl, hospital_site).href;
            }

            synthesizedData.specialty = await popup.locator('p.major').innerText();

            const accordionSections = await popup.locator('.layerpopup-doctor-detail-accordion dl').all();
            for (const section of accordionSections) {
                const title = await section.locator('dt button span').innerText();
                const contentLi = section.locator('dd ul li');

                if (await contentLi.count() === 0) continue;

                const contentHtml = await contentLi.innerHTML();

                if (title.includes('학회 활동/ 논문')) {
                    const parts = contentHtml.split(/주요논문 및 저서/i);
                    const academicPart = parts[0];
                    const paperPart = parts.length > 1 ? parts[1] : '';

                    if (academicPart) {
                        const academicItems = academicPart.split(/<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, '').replace('학회활동', '').trim()).filter(Boolean);
                        synthesizedData.학술 = academicItems.map(content => ({ date: null, content }));
                    }

                    if (paperPart) {
                        const paperItems = paperPart.split(/<br\s*\/?>/i).map(s => s.replace(/•/g, '').replace(/<[^>]+>/g, '').trim()).filter(Boolean);
                        synthesizedData.논문 = paperItems;
                    }
                } else if (title.includes('학력') || title.includes('경력')) {
                    const items = contentHtml.split(/<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
                    synthesizedData.경력 = (synthesizedData.경력 || []).concat(items.map(content => ({ date: null, content })));
                } else if (title.includes('언론')) {
                     const items = contentHtml.split(/<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
                     synthesizedData.언론 = (synthesizedData.언론 || []).concat(items.map(content => ({ targetDate: null, type: '기사', text: content, url: null, issuer: null })))
                }
            }

        } else {
            isAttend = false;
            error = `Doctor '${bedoc_doctorname}' not found in the list.`;
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
    } finally {
        await browser.close();
    }

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
            if(!result.error) delete updatedData.error;

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