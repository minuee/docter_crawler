
const { chromium } = require('playwright');
const fs = require('fs');

// Final, corrected parser for Ulsan University Hospital (H01KR-48000006)
async function parseUlsanDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let synthesizedData = { 학력: [], 경력: [], 저서: [], 학술: [], 논문: [], 언론: [] };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        isAttend = (await page.textContent('body')).includes(doctorData.bedoc_doctorname);
        if (!isAttend) {
            throw new Error(`Doctor name ${doctorData.bedoc_doctorname} not found on page.`);
        }

        synthesizedData.profileUrl = await page.locator('img[alt="김성철"]').first().getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);

        const specialtyElement = page.locator('p:has(strong:has-text("진료분야"))');
        if (await specialtyElement.count() > 0) {
            const specialtyText = await specialtyElement.textContent();
            synthesizedData.specialty = specialtyText.replace('진료분야', '').trim();
        }

        const eduItems = await page.locator('h3:has-text("학력") + ul > li').allTextContents();
        synthesizedData.학력 = eduItems.map(item => ({ date: null, content: item.trim() }));

        const expItems = await page.locator('h3:has-text("경력") + ul > li').allTextContents();
        synthesizedData.경력 = expItems.map(item => ({ date: null, content: item.trim() }));

        const affiliationItems = await page.locator('h3:has-text("소속학회") + ul > li').allTextContents();
        synthesizedData.학술 = affiliationItems.map(item => ({ date: null, content: item.trim() }));

        const bookSectionItems = await page.locator('h3:has-text("저서, 특허") + ul > li').allTextContents();
        let isBookSection = false;
        bookSectionItems.forEach(item => {
            if (item.includes('저서')) {
                isBookSection = true;
            } else if (item.includes('특허')) {
                isBookSection = false;
            }
            if (isBookSection && !item.includes('저서')) {
                synthesizedData.저서.push({ date: null, content: item.trim() });
            }
        });

        // Click and parse Papers Tab
        const papersTabButton = page.locator('ul.c-tab03 a:has-text("논문")');
        if (await papersTabButton.count() > 0) {
            await papersTabButton.click();
            await page.waitForSelector('#tab_cts_2 ul.c-list01 li', { state: 'visible', timeout: 5000 }); // Wait for list items
            const paperItems = await page.locator('#tab_cts_2 ul.c-list01 li').allTextContents();
            synthesizedData.논문 = paperItems.map(item => item.trim());
        }

        // Click and parse Media Tab
        const mediaTabButton = page.locator('ul.c-tab03 a:has-text("언론")');
        if (await mediaTabButton.count() > 0) {
            await mediaTabButton.click();
            await page.waitForSelector('#tab_cts_3 ul.media-list li', { state: 'visible', timeout: 5000 }); // Wait for list items
            const mediaItems = await page.locator('#tab_cts_3 ul.media-list li').evaluateAll(elements =>
                elements.map(el => {
                    const a = el.querySelector('a');
                    const title = a?.querySelector('.tit')?.textContent.trim() || '';
                    const url = a?.href || null;
                    const issuer = a?.querySelector('.source')?.textContent.trim() || null;
                    const date = a?.querySelector('.date')?.textContent.trim() || null;
                    return { targetDate: date, type: '기사', text: title, url: url, issuer: issuer };
                })
            );
            synthesizedData.언론 = mediaItems;
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        isAttend = false;
    } finally {
        await browser.close();
    }

    return { ...synthesizedData, isAttend, error };
}

if (require.main === module) {
    (async () => {
        const doctorFilePath = process.argv[2];
        if (!doctorFilePath) {
            console.error('Usage: node parser.js <path_to_doctor_json>');
            process.exit(1);
        }

        let doctorData;
        try {
            doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
        } catch (e) {
            console.error(`Failed to read or parse JSON file: ${doctorFilePath}`);
            process.exit(1);
        }

        const result = await parseUlsanDoctorProfile(doctorData);

        const finalData = { ...doctorData };
        for (const key in result) {
            if (Array.isArray(result[key]) && result[key].length > 0) {
                finalData[key] = result[key];
            } else if (!Array.isArray(result[key]) && result[key] !== null) {
                finalData[key] = result[key];
            }
        }

        if (result.error) {
            finalData.isSearchType = 'html_playwright_failed';
            finalData.isExist = false;
        } else {
            finalData.isSearchType = 'html_playwright';
            finalData.isExist = true;
        }
        
        finalData.error = result.error;

        fs.writeFileSync(doctorFilePath, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`File updated successfully: ${doctorFilePath}`);
    })();
}
