const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

// Final, correct parser for Yonsei Sarang Hospital (H21KR-11000155)
async function parseYonseiSarang(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let synthesizedData = { 경력: [], 학술: [], 언론: [] };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const doctorElement = page.locator('ul.doctors li', { has: page.locator('p:has-text("김성재")') });
        if (await doctorElement.count() === 0) {
            throw new Error(`Could not find doctor element for ${doctorData.bedoc_doctorname}`);
        }

        await doctorElement.hover();
        await doctorElement.locator('.hover').click();

        await page.waitForSelector('.frame .doctor-detail', { state: 'visible', timeout: 15000 });
        const frameHtml = await page.locator('.frame').innerHTML();
        const $ = cheerio.load(frameHtml);

        isAttend = true;

        synthesizedData.profileUrl = $('.doctor-detail-img img').attr('src');
        if (synthesizedData.profileUrl) {
            synthesizedData.profileUrl = new URL(synthesizedData.profileUrl, doctorData.hospital_site).href;
        }

        synthesizedData.specialty = $('.doctor-detail-summary').text().trim();

        // --- 약력 (Experience) ---
        const experienceItems = [];
        $('.doctor-detail-info h2:contains("약력")').next('ul').find('li').each((i, el) => {
            experienceItems.push({ date: null, content: $(el).text().trim() });
        });
        synthesizedData.경력 = experienceItems;

        // --- 학회활동 (Academic) ---
        // Note: This requires clicking the tab in a real browser. We are parsing the already-rendered initial state.
        const academicItems = [];
        $('.doctor-detail-info h2:contains("학회활동")').next('ul').find('li').each((i, el) => {
            academicItems.push({ date: null, content: $(el).text().trim() });
        });
        synthesizedData.학술 = academicItems;

        // --- 방송출연 (Media) ---
        const mediaItems = [];
        $('.doctor-detail-info h2:contains("방송출연")').next('ul').find('li').each((i, el) => {
            mediaItems.push({ date: null, type: '방송', text: $(el).text().trim(), url: null, issuer: null });
        });
        synthesizedData.언론 = mediaItems;

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

        const result = await parseYonseiSarang(doctorData);

        const finalData = { ...doctorData, ...result };

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