const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 수상: [], 학술: [], 논문: [], 저서: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });
        if ((await page.textContent('body')).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 1. Profile URL and Specialty
        const profileUrlSrc = await page.locator('.doc_img img').getAttribute('src').catch(() => null);
        synthesizedData.profileUrl = profileUrlSrc ? new URL(profileUrlSrc, doctorData.hospital_site).href : null;
        synthesizedData.specialty = await page.locator('.doctor_dept dd').innerText().then(cleanText);

        // 2. Tab 1: 학력, 경력, 학술, 수상
        const tab1 = page.locator('#tab-1');

        // 학력 및 경력
        const eduExpItems = await tab1.locator('h3:has-text("학력 및 경력") + ul li').allTextContents();
        eduExpItems.forEach(item => {
            const cleanedItem = cleanText(item);
            if (cleanedItem.includes('학사') || cleanedItem.includes('석사') || cleanedItem.includes('박사') || cleanedItem.includes('졸업')) {
                synthesizedData.학력.push({ date: null, content: cleanedItem });
            } else {
                synthesizedData.경력.push({ date: null, content: cleanedItem });
            }
        });

        // 학회활동
        const academicItems = await tab1.locator('h3:has-text("학회활동") + ul li').allTextContents();
        synthesizedData.학술 = academicItems.map(item => ({ date: null, content: cleanText(item) }));

        // 수상이력
        const awardItems = await tab1.locator('h3:has-text("수상이력") + ul li').allTextContents();
        synthesizedData.수상 = awardItems.map(item => ({ date: null, content: cleanText(item) }));

        // 3. Tab 2: 논문/저서
        const tab2 = page.locator('#tab-2');
        const paperBookItems = await tab2.locator('h3:has-text("논문/저서") + ul li').allTextContents();
        paperBookItems.forEach(item => {
            const cleanedItem = cleanText(item);
            // A simple heuristic to differentiate books from papers. This might need refinement.
            if (cleanedItem.length < 50) { // Assume shorter texts are book titles
                synthesizedData.저서.push({ date: null, content: cleanedItem, issuer: null });
            } else {
                synthesizedData.논문.push(cleanedItem);
            }
        });

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false; // Reset on error
    } finally {
        if (browser) { await browser.close(); }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    // Remove empty arrays from the final result
    Object.keys(finalResult).forEach(key => {
        if (Array.isArray(finalResult[key]) && finalResult[key].length === 0) {
            delete finalResult[key];
        }
    });

    return finalResult;
}

if (require.main === module) {
    const doctorFilePath = process.argv[2];
    if (!doctorFilePath) {
        console.error("Error: Please provide the path to the doctor's JSON file.");
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Critical error: Could not read or parse ${doctorFilePath}`, e);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            // Merge new data, overwriting existing fields if they were re-parsed
            const updatedDoctorData = { ...doctorData, ...result };
            
            const hasNewData = (result.학력 && result.학력.length > 0) || (result.경력 && result.경력.length > 0);

            if (result.error) {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
                updatedDoctorData.error = result.error;
            } else if (hasNewData) {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
                delete updatedDoctorData.error; // Clear previous errors
            } else {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
                updatedDoctorData.error = "Playwright parser completed but found no new education or experience data.";
            }
            
            updatedDoctorData.isAttend = result.isAttend;

            // Clean up old, unstructured fields if they exist
            delete updatedDoctorData.education;
            delete updatedDoctorData.experience;
            delete updatedDoctorData.thesis;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated successfully: ${path.basename(doctorFilePath)}`);
        })
        .catch(error => {
            console.error(`Critical error during parse execution for ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}