const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument.');
        process.exit(1);
    }

    const outputFilePath = 'parser_output.json';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('h5.doctor_name', { timeout: 10000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        const synthesizedData = { 학력: [], 경력: [], 학술: [] };

        let profileImgSrc = $('.profile .photo img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
        }

        synthesizedData.specialty = $('.doctor_major .title span').text().trim();

        // Process '주요경력'
        const experienceP = $('h4.titTypeA:contains("주요경력")').nextAll('p.txtTypeF').first();
        if (experienceP.length) {
            experienceP.html().split('<br>').forEach(line => {
                const cleanedLine = line.trim();
                if (cleanedLine.startsWith('[학력]')) {
                    synthesizedData.학력.push({ date: null, content: cleanedLine.replace('[학력]', '').trim() });
                } else if (cleanedLine.startsWith('[경력]')) {
                    synthesizedData.경력.push({ date: null, content: cleanedLine.replace('[경력]', '').trim() });
                } else if (cleanedLine.toLowerCase().startsWith('현)')) {
                    synthesizedData.경력.push({ date: null, content: cleanedLine });
                }
            });
        }
        
        // Process '등록학회'
        const academicP = $('h4.titTypeA:contains("등록학회")').nextAll('p.txtTypeF').first();
        if (academicP.length) {
            academicP.html().split('<br>').forEach(line => {
                const cleanedLine = line.trim();
                if (cleanedLine) {
                    synthesizedData.학술.push({ date: null, content: cleanedLine });
                }
            });
        }

        fs.writeFileSync(outputFilePath, JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        fs.writeFileSync(outputFilePath, JSON.stringify({ error: e.message, stack: e.stack }));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
