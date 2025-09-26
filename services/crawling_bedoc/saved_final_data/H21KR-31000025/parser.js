
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], specialty: null, profileUrl: null, isAttend: true };
    const screenshotPath = path.join(__dirname, 'temp_ocr_image.png');

    try {
        await page.goto(url, { waitUntil: 'networkidle' });

        // Extract basic info
        const basicInfo = await page.evaluate(() => {
            const nameElement = document.querySelector('.font_malgun.font_17 strong');
            const specialtyElement = document.querySelector('p.medical_field');
            const profileImgElement = document.querySelector('td[valign="top"] > img');

            return {
                name: nameElement ? nameElement.textContent.trim() : null,
                specialty: specialtyElement ? specialtyElement.textContent.replace('전문분야','').trim() : null,
                profileUrl: profileImgElement ? new URL(profileImgElement.src, document.baseURI).href : null
            };
        });

        synthesizedData.specialty = basicInfo.specialty;
        synthesizedData.profileUrl = basicInfo.profileUrl;

        // Take screenshot of the profile image for OCR
        const imageElement = await page.$('div#ct img');
        if (imageElement) {
            await imageElement.screenshot({ path: screenshotPath });
            // The next step would be to use a tool to read the text from this image,
            // but since I can't call another tool from here, I will output the path.
            // The controlling agent (Gemini) will handle the OCR and final parsing.
            synthesizedData.ocr_image_path = screenshotPath;
        } else {
            throw new Error('Could not find the profile image for OCR.');
        }

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error(JSON.stringify({ error: `Execution failed: ${e.message}` }));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
