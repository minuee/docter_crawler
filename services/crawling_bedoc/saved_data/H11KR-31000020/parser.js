const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const hospitalSite = process.argv[2]; // Main doctor page URL (act=deptDocInfo)
    const doctorName = process.argv[3];
    const aigaHid = process.argv[4];

    console.log("Main hospitalSite:", hospitalSite); // Debugging line
    console.log("doctorName:", doctorName); // Debugging line

    let extractedData = {
        specialty: null,
        학력: [],
        경력: [],
        논문: [],
        저서: [],
        profileUrl: null,
        isAttend: false
    };

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        // --- Navigate to Main Doctor Page (act=deptDocInfo) ---
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 10 * 60 * 1000));
        const navigationPromise = page.goto(hospitalSite, { waitUntil: 'domcontentloaded', timeout: 60000 });
        let result = await Promise.race([navigationPromise, timeoutPromise]);

        if (result === 'timeout') {
            console.error('Playwright operation timed out after 10 minutes during initial navigation.');
        } else {
            await page.waitForLoadState('networkidle', { timeout: 30000 });
        }

        const content = await page.content();

        if (content.includes(doctorName)) {
            extractedData.isAttend = true;
        }

        // --- Data Extraction from Main Page ---
        // Profile URL
        const profileImg = await page.$('div.doctor_box p.doctor_img img');
        if (profileImg) {
            extractedData.profileUrl = await profileImg.getAttribute('src');
            if (extractedData.profileUrl && !extractedData.profileUrl.startsWith('http')) {
                extractedData.profileUrl = new URL(extractedData.profileUrl, hospitalSite).href;
            }
        }

        // Specialty
        const specialtyElement = await page.$('div.doctor_box ul li:has(strong:has-text("전문진료분야"))');
        if (specialtyElement) {
            const specialtyText = await specialtyElement.textContent();
            extractedData.specialty = specialtyText.replace('전문진료분야', '').replace(':', '').trim();
        }

        // 학력 (Education) and 경력 (Experience) - from main page
        const careerSection = await page.$('h5:has-text("경력") + div.sub_tt');
        if (careerSection) {
            const careerText = await careerSection.innerText();
            const lines = careerText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

            lines.forEach(line => {
                if (line.includes('졸업') || line.includes('학사') || line.includes('석사') || line.includes('박사')) {
                    extractedData.학력.push({ content: line.replace(/^- /, '') });
                } else {
                    extractedData.경력.push({ content: line.replace(/^- /, '') });
                }
            });
        }

        // --- Navigate to "연구업적" Page using the provided HTML structure ---
        const researchLinkElement = await page.$('ul.tab_list a:has-text("연구업적")');
        let researchUrl = null;
        if (researchLinkElement) {
            researchUrl = await researchLinkElement.getAttribute('href');
            // Ensure the URL is absolute
            if (researchUrl && !researchUrl.startsWith('http')) {
                researchUrl = new URL(researchUrl, hospitalSite).href;
            }
            console.log("Extracted Research Achievements URL:", researchUrl); // Debugging line
        } else {
            console.warn("연구업적 link not found using ul.tab_list a:has-text(\"연구업적\").");
            // Fallback to constructing the URL if not found via selector (as a safety measure)
            researchUrl = hospitalSite.replace('act=deptDocInfo', 'act=doctorStudy');
            console.log("Falling back to constructed Research Achievements URL:", researchUrl);
        }

        if (researchUrl) {
            result = await Promise.race([page.goto(researchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }), timeoutPromise]);

            if (result === 'timeout') {
                console.error('Playwright operation timed out after 10 minutes during research achievements navigation.');
            } else {
                await page.waitForLoadState('networkidle', { timeout: 30000 });
            }

            // Extract "논문" and "저서" from the research achievements page
            // These selectors are placeholders and need to be verified by inspecting the actual page.
            const thesesItems = await page.$eval('div.research-theses ul li', items => items.map(item => item.textContent.trim().replace(/"/g, '')));
            if (thesesItems.length > 0) {
                extractedData.논문 = thesesItems;
            }

            const booksItems = await page.$eval('div.research-books ul li', items => items.map(item => ({ content: item.textContent.trim().replace(/"/g, '') })));
            if (booksItems.length > 0) {
                extractedData.저서 = booksItems;
            }
        } else {
            console.error("Could not determine Research Achievements URL.");
        }

        // 학술 (Academic Activities) - from main page
        const academicSection = await page.$('h5:has-text("소속학회") + div.sub_tt');
        if (academicSection) {
            const academicText = await academicSection.innerText();
            const lines = academicText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            lines.forEach(line => {
                extractedData.학술.push({ content: line.replace(/^- /, '') });
            });
        }

    } catch (error) {
        console.error(`Error during Playwright operation for ${doctorName}:`, error);
        extractedData.error = error.message;
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    console.log(JSON.stringify(extractedData));

})();
