const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseSection(page, sectionTitle) {
    const items = [];
    const sectionLocator = page.locator(`div.cont_main_profile > div:has(> strong:text("${sectionTitle}"))`);
    
    if (await sectionLocator.count() > 0) {
        while (true) {
            const moreButton = sectionLocator.locator('.profile_view_more a');
            if (await moreButton.count() > 0 && await moreButton.isVisible()) {
                await moreButton.click();
                await page.waitForTimeout(500);
            } else {
                break;
            }
        }

        const listItems = await sectionLocator.locator('ul li').all();
        for (const el of listItems) {
            const dateText = await el.locator('dl dt').count() > 0 ? cleanText(await el.locator('dl dt').innerText()) : null;
            const contentText = await el.locator('dl dd').count() > 0 ? cleanText(await el.locator('dl dd').innerText()) : null;
            
            if (contentText) {
                items.push({ date: dateText, content: contentText });
            }
        }
    }
    return items;
}

async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = {};
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForSelector(`.doc_name strong:has-text("${doctorData.bedoc_doctorname}")`, { timeout: 15000 });
        
        isAttend = true;

        synthesizedData.profileUrl = new URL(await page.locator('div.cont_bg').first().getAttribute('data-img-1'), doctorData.hospital_site).href;
        synthesizedData.specialty = cleanText(await page.locator('div.doc_intro_txt dl dd p').innerText());

        synthesizedData.학력 = await parseSection(page, '학력');
        const experience = await parseSection(page, '경력');
        const training = await parseSection(page, '연수');
        synthesizedData.경력 = [...experience, ...training];
        synthesizedData.수상 = await parseSection(page, '수상이력');

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        isAttend = false;
    } finally {
        await browser.close();
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    
    Object.keys(finalResult).forEach(key => {
        const value = finalResult[key];
        if ((Array.isArray(value) && value.length === 0)) {
           delete finalResult[key];
        }
    });

    return finalResult;
}

if (require.main === module) {
    const doctorFilePath = process.argv[2];
    if (!doctorFilePath) {
        console.error('Usage: node parser.js <path_to_doctor_json_file>');
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            let updatedDoctorData = { ...doctorData, ...result };

            updatedDoctorData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedDoctorData.isExist = !result.error;
            updatedDoctorData.isAttend = result.isAttend;
            updatedDoctorData.error = result.error || null;
            
            delete updatedDoctorData.education;
            delete updatedDoctorData.experience;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}