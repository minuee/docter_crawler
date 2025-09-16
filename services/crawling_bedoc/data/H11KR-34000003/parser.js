const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const hospitalSite = process.argv[2];
    const doctorName = process.argv[3];
    const aigaHid = process.argv[4]; // For constructing absolute profileUrl if needed

    console.log("hospitalSite:", hospitalSite); // Debugging line
    console.log("doctorName:", doctorName); // Debugging line

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let extractedData = {
        specialty: null,
        학력: [],
        경력: [],
        profileUrl: null,
        isAttend: false
    };

    try {
        // Set a 10-minute timeout for the entire Playwright operation
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 10 * 60 * 1000));

        const navigationPromise = page.goto(hospitalSite, { waitUntil: 'domcontentloaded', timeout: 60000 }); // 60 seconds for initial navigation

        const result = await Promise.race([navigationPromise, timeoutPromise]);

        if (result === 'timeout') {
            console.error('Playwright operation timed out after 10 minutes.');
            // Even if timed out, try to extract whatever is available
        } else {
            await page.waitForLoadState('networkidle', { timeout: 30000 }); // Wait for network to be idle for up to 30 seconds
        }

        const content = await page.content();

        // Check for doctor's name to determine attendance
        if (content.includes(doctorName)) {
            extractedData.isAttend = true;
        }

        // Sanitize content (basic example, more robust sanitization might be needed)
        const sanitizedContent = content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');

        // --- Data Extraction ---
        // Profile URL
        const profileImg = await page.$('div.doc-photo img'); // Common selector for profile image
        if (profileImg) {
            extractedData.profileUrl = await profileImg.getAttribute('src');
            if (extractedData.profileUrl && !extractedData.profileUrl.startsWith('http')) {
                // Construct absolute URL using the base hospital site
                extractedData.profileUrl = new URL(extractedData.profileUrl, hospitalSite).href;
            }
        }

        // Specialty
        const specialtyElement = await page.$('div.doc-info strong'); // Common selector for specialty
        if (specialtyElement) {
            extractedData.specialty = (await specialtyElement.textContent()).trim();
        }

        // 학력 (Education)
        const educationItems = await page.$$eval('div.academic-background ul li', items => items.map(item => ({ content: item.textContent.trim().replace(/"/g, '') })));
        if (educationItems.length > 0) {
            extractedData.학력 = educationItems;
        }

        // 경력 (Experience)
        const careerItems = await page.$$eval('div.career-history ul li', items => items.map(item => ({ content: item.textContent.trim().replace(/"/g, '') })));
        if (careerItems.length > 0) {
            extractedData.경력 = careerItems;
        }

    } catch (error) {
        console.error(`Error during Playwright operation for ${doctorName}:`, error);
        extractedData.error = error.message;
    } finally {
        await browser.close();
    }

    // Output the extracted data as JSON
    console.log(JSON.stringify(extractedData));

})();