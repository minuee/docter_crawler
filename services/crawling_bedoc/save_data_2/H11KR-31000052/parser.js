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

    const url = doctorData.hospital_site;
    if (!url) {
        console.error('URL not found in the JSON file.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let success = false;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const $ = cheerio.load(html);

        synthesizedData.profileUrl = $('img.doc_img').attr('src');
        synthesizedData.specialty = $('.doc-clinic-detail').text().trim().replace(/"/g, '');

        synthesizedData.학력 = [];
        synthesizedData.경력 = [];
        synthesizedData.학술 = [];

        $('.doc-history-02 > p').each((i, el) => {
            const title = $(el).text().trim();
            const list = $(el).next('ul.ul-marker-circle');
            if (title === '경력 및 학력') {
                list.find('li').each((j, item) => {
                    const content = $(item).text().trim().replace(/"/g, '');
                    if (content.includes('석사') || content.includes('박사') || content.includes('학사') || content.includes('졸업')) {
                        synthesizedData.학력.push({ date: null, content });
                    } else {
                        synthesizedData.경력.push({ date: null, content });
                    }
                });
            } else if (title === '학회활동') {
                list.find('li').each((j, item) => {
                    const content = $(item).text().trim().replace(/"/g, '');
                    synthesizedData.학술.push({ date: null, content });
                });
            }
        });

        success = true;

    } catch (e) {
        synthesizedData.error = e.message;
    } finally {
        await browser.close();

        const finalData = { ...doctorData, ...synthesizedData };
        if (success && (finalData.학력.length > 0 || finalData.경력.length > 0)) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
            finalData.error = null;
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
        }
        
        fs.writeFileSync(jsonPath, JSON.stringify(finalData, null, 2));
    }
})();
