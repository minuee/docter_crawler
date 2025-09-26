const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const $ = cheerio.load(html);

        const synthesizedData = {
            "specialty": "정형외과",
            "학력": [],
            "경력": [],
            "학술": [],
            "논문": [],
            "수상": [],
            "저서": [],
            "언론": []
        };

        synthesizedData.profileUrl = $('div.elementor-element-65f4b90 img').attr('src');

        const extractToggleContent = (tabId) => {
            const items = [];
            const contentDiv = $(`#${tabId}`);
            const htmlContent = contentDiv.html();
            if (htmlContent) {
                htmlContent.split(/<br>|\n/).forEach(line => {
                    const cleanedContent = line.replace(/<[^>]*>/g, '').trim().replace(/"/g, '');
                    if (cleanedContent) {
                        const dateMatch = cleanedContent.match(/^·?\s*(\d{4})/);
                        const date = dateMatch ? dateMatch[1] : null;
                        const content = cleanedContent.replace(/^·?\s*(\d{4})?/, '').trim();
                        items.push({ date, content });
                    }
                });
            }
            return items;
        };

        synthesizedData.경력 = extractToggleContent('elementor-tab-content-1071');
        synthesizedData.학술 = extractToggleContent('elementor-tab-content-1072');
        synthesizedData.수상 = extractToggleContent('elementor-tab-content-1073');

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
