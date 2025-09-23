const { chromium } = require('playwright');
const fs = require('fs');

// Helper function to clean text
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data: hospital_site is missing.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        // Find the container for the specific doctor
        const doctorContainer = page.locator('.doctor_wrap', { hasText: doctorData.bedoc_doctorname });
        const doctorExists = await doctorContainer.count() > 0;

        if (doctorExists) {
            isAttend = true;

            // Extract profile URL
            const profileImg = doctorContainer.locator('.doctor_thumb img');
            const imgSrc = await profileImg.getAttribute('src');
            if (imgSrc) {
                synthesizedData.profileUrl = new URL(imgSrc, doctorData.hospital_site).href;
            }

            // Extract education and experience
            const careerItems = await doctorContainer.locator('.doctor_career .txt_style3').allInnerTexts();
            careerItems.forEach(item => {
                const cleanItem = cleanText(item);
                if (cleanItem.includes('졸업') || cleanItem.includes('석사') || cleanItem.includes('박사')) {
                    synthesizedData.학력.push({ date: null, content: cleanItem });
                } else {
                    synthesizedData.경력.push({ date: null, content: cleanItem });
                }
            });

            // Specialty is not explicitly available on this page, so it remains null

        } else {
            isAttend = false;
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false; // Ensure isAttend is false on error
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Final data structuring
    const finalResult = { ...synthesizedData, isAttend, error };
    Object.keys(finalResult).forEach(key => {
        // Remove empty arrays from the final result
        if (Array.isArray(finalResult[key]) && finalResult[key].length === 0) {
            delete finalResult[key];
        }
    });

    return finalResult;
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
            
            // Determine search type based on result
            const hasData = result.학력?.length > 0 || result.경력?.length > 0;
            if (result.error) {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
                updatedDoctorData.error = result.error; // Keep the error message
            } else if (hasData) {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
                delete updatedDoctorData.error; // Clean up old error message
            } else {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
                updatedDoctorData.error = "Playwright ran but found no education/experience data.";
            }
            
            updatedDoctorData.isAttend = result.isAttend;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated successfully: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
