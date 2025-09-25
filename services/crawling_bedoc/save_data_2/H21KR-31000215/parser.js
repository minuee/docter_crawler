const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Helper to clean text
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = {
        학력: [],
        경력: [],
    };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const doctorListItem = page.locator('li.listItem').filter({ hasText: doctorData.bedoc_doctorname });

        if (await doctorListItem.count() > 0) {
            await doctorListItem.locator('button:has-text("자세히보기")').click();

            // CORRECTED: Wait for the correct popup selector
            const popupSelector = 'aside#doctorView'; 
            await page.waitForSelector(popupSelector, { state: 'visible', timeout: 10000 });
            const popup = page.locator(popupSelector);

            isAttend = true;

            // --- Start Parsing the Corrected Popup ---

            // Profile URL
            const imgSrc = await popup.locator('.picture img').getAttribute('src');
            if (imgSrc) {
                synthesizedData.profileUrl = new URL(imgSrc, doctorData.bedoc_hospitalsite).href;
            }

            // Specialty
            synthesizedData.specialty = cleanText(await popup.locator('.partNames').innerText());

            // Education and Career
            const historyItems = await popup.locator('.profileBox ul li').all();
            for (const item of historyItems) {
                const text = cleanText(await item.innerText());
                if (text) { // Ensure not adding empty lines
                    // Logic to differentiate education from career
                    if (text.includes('대학') || text.includes('석사') || text.includes('박사') || text.includes('졸업')) {
                        synthesizedData.학력.push({ date: null, content: text });
                    } else {
                        synthesizedData.경력.push({ date: null, content: text });
                    }
                }
            }
            // --- End Parsing the Popup ---

        } else {
            throw new Error(`Doctor ${doctorData.bedoc_doctorname} not found on the list page.`);
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        isAttend = false;
    } finally {
        await browser.close();
    }

    const finalResult = { ...synthesizedData, isAttend, error };

    Object.keys(finalResult).forEach(key => {
        const value = finalResult[key];
        if ((Array.isArray(value) && value.length === 0) || value === '' || value === null || value === undefined) {
           delete finalResult[key];
        }
    });

    return finalResult;
}

// Main execution block
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

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
