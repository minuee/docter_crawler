const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    const jsonPath = process.argv[2];
    if (!jsonPath) {
        console.error('Please provide a path to the JSON file as an argument.');
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
        console.error('Failed to read or parse the JSON file.');
        process.exit(1);
    }

    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let success = false;

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        synthesizedData.profileUrl = new URL($('.read_body .col-md-3 img').attr('src'), hospital_site).href;
        synthesizedData.specialty = $("dt:contains('전문분야') + dd").text().trim().replace(/\s+/g, ' ').replace(/"/g, '');

        const education = [];
        const experience = [];
        const academic = [];

        const profileText = $('#home pre').text();
        profileText.split('\n').forEach(line => {
            const content = line.trim().replace(/"/g, '');
            if (!content) return;

            if (content.includes('졸업') || content.includes('석사') || content.includes('박사')) {
                education.push({ date: null, content: content });
            } else {
                experience.push({ date: null, content: content });
            }
        });

        const academicText = $('#profile pre').text();
        academicText.split('\n').forEach(line => {
            const content = line.trim().replace(/"/g, '');
            if (content) {
                academic.push({ date: null, content: content });
            }
        });

        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;
        synthesizedData.학술 = academic;
        synthesizedData.isAttend = $('body').text().includes(bedoc_doctorname);

        success = true;

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        synthesizedData.error = e.message;
    } finally {
        await browser.close();

        const finalData = { ...doctorData, ...synthesizedData };
        if (success && (finalData.학력.length > 0 || finalData.경력.length > 0)) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
        }
        
        fs.writeFileSync(jsonPath, JSON.stringify(finalData, null, 2));
        console.log(`File updated: ${jsonPath}`);
    }
})();
