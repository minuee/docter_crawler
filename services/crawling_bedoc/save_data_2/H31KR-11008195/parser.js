const { chromium } = require('playwright');
const fs = require('fs');

async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let error = "Playwright failed: Doctor information is embedded in an image and cannot be extracted.";
    let isAttend = false; // Cannot verify attendance from an image

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });
        // The page contains information within an image, so no selectors can be used.
        // We confirm the doctor's name is not found in a parsable context.
        const bodyText = await page.textContent('body');
        if (bodyText.includes(doctorData.bedoc_doctorname)) {
            // Name might be found in unrelated text, but we can't get profile data.
            // We can consider this a weak signal of attendance, but since we can't parse details, we'll stick to the failure path.
        }

    } catch (e) {
        // Update error message if the page navigation itself fails
        error = `Playwright page navigation failed: ${e.message}`;
        console.error(error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Return a result indicating failure
    return { isAttend, error };
}

// Main execution block
if (require.main === module) {
    const doctorFilePath = process.argv[2];
    if (!doctorFilePath) {
        console.error("Error: Doctor JSON file path is required.");
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${doctorFilePath}`, e);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };
            
            updatedDoctorData.isSearchType = 'html_playwright_failed';
            updatedDoctorData.isExist = false; // Cannot confirm existence from image
            updatedDoctorData.isAttend = result.isAttend;
            updatedDoctorData.error = result.error; // Assign the specific error message

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated to reflect parsing failure: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
