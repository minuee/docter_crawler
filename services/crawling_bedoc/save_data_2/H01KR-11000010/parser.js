const { chromium } = require('playwright');
const fs = require('fs');

const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 논문: [] };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });

        if ((await page.content()).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // Extract profile image and specialty
        synthesizedData.profileUrl = await page.locator('.list_banner .img_bg').first().getAttribute('src').then(src => new URL(src, doctorData.hospital_site).href).catch(() => null);
        synthesizedData.specialty = await page.locator('.photoDetailBox li:has-text("전문분야") .detailText').textContent().then(cleanText);

        // Extract Education and Career (default tab)
        const eduList = await page.locator('dl.textList2 dt:has-text("학력") + dd ul.textListCon li').all();
        for (const item of eduList) {
            const content = await item.locator('p').textContent();
            synthesizedData.학력.push({ content: cleanText(content) });
        }

        const careerList = await page.locator('dl.textList2 dt:has-text("경력") + dd ul.textListCon li').all();
        for (const item of careerList) {
            const content = await item.locator('p').textContent();
            synthesizedData.경력.push({ content: cleanText(content) });
        }

        // Click on the 'Academic Activities' tab, then the 'Papers' sub-tab
        const academicTab = page.locator('a[title="의료진 학술활동"]:has-text("학술활동")');
        if (await academicTab.count() > 0) {
            await academicTab.click();
            await page.waitForTimeout(500);
            const paperSubTab = page.locator('a[title="의료진 논문"]');
            if (await paperSubTab.count() > 0) {
                await paperSubTab.click();
                await page.waitForSelector('dl.textList3 dt:has-text("논문")', { state: 'visible', timeout: 5000 });

                const paperList = await page.locator('dl.textList3 dt:has-text("논문") + dd ul.textListCon li').all();
                for (const item of paperList) {
                    const content = await item.textContent();
                    synthesizedData.논문.push(cleanText(content));
                }
            }
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false;
    } finally {
        if (browser) { await browser.close(); }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    Object.keys(finalResult).forEach(key => {
        if (Array.isArray(finalResult[key]) && finalResult[key].length === 0) { delete finalResult[key]; }
    });
    return finalResult;
}

if (require.main === module) {
    const doctorFilePath = process.argv[2];
    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };
            if (result.error || (!result.학력 && !result.경력)) {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
            } else {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
            }
            updatedDoctorData.isAttend = result.isAttend;
            delete updatedDoctorData.error;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}