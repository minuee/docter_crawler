const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function parse(url) {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        let specialty = '';
        const fullText = await page.locator('body').innerText(); // Get full text of the body
        const specialtyStartIndex = fullText.indexOf('진료분야');
        const doctorIntroStartIndex = fullText.indexOf('의료진 소개');
        if (specialtyStartIndex !== -1 && doctorIntroStartIndex !== -1 && specialtyStartIndex < doctorIntroStartIndex) {
            const specialtySectionText = fullText.substring(specialtyStartIndex + '진료분야'.length, doctorIntroStartIndex).trim();
            const specialtyLines = specialtySectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            specialty = specialtyLines.join(', '); // Join lines with comma and space
        }

        let education = [];
        let experience = [];
        let academicActivities = [];

        const nextSectionStartIndex = fullText.indexOf('진료안내', doctorIntroStartIndex); // Find the start of the next section
        
        if (doctorIntroStartIndex !== -1 && nextSectionStartIndex !== -1 && doctorIntroStartIndex < nextSectionStartIndex) {
            const doctorInfoSectionText = fullText.substring(doctorIntroStartIndex + '의료진 소개'.length, nextSectionStartIndex).trim();
            const lines = doctorInfoSectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

            for (const line of lines) {
                if (line.includes('학사') || line.includes('석사') || line.includes('박사') || line.includes('졸업')) {
                    education.push({ content: line });
                } else if (line.includes('학회') || line.includes('회원') || line.includes('회장')) {
                    academicActivities.push({ content: line });
                } else if (line.length > 0) {
                    experience.push({ content: line });
                }
            }
        }

        const data = {
            specialty: specialty,
            학력: education,
            경력: experience,
            논문: [],
            학술: academicActivities,
            저서: [],
            profileUrl: null,
        };

        // Debugging output
        console.log("Full text of body:");
        console.log(fullText);

        await browser.close();
        return { success: true, data };

    } catch (error) {
        await browser.close();
        console.error(`Error in parser for H21KR-31000165: ${error.message}`);
        return { success: false, error: error.message };
    }
}

if (require.main === module) {
    (async () => {
        const url = process.argv[2];
        if (!url) {
            console.error('Please provide a URL as an argument.');
            process.exit(1);
        }
        const result = await parse(url);
        if (result.success) {
            console.log(JSON.stringify(result.data, null, 2));
        }
    })();
}

module.exports = { parse };
