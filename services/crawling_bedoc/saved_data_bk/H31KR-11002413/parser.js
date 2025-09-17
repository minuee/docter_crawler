const { chromium } = require('playwright');
const cheerio = require('cheerio');
const { URL } = require('url');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let result = { error: null };

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const $ = cheerio.load(html);

        let parsedDetails = {};
        
        const doctorDiv = $(`div.dt-sc-gynecologist-single:has(h4:contains("${bedoc_doctorname}"))`);

        if (doctorDiv.length > 0) {
            parsedDetails.isAttend = true;
        } else {
            parsedDetails.isAttend = false;
            throw new Error(`Could not find container for doctor ${bedoc_doctorname}`);
        }

        const profileSrc = doctorDiv.find('.dt-sc-gynecologist-thumb img').attr('src');
        if (profileSrc) {
            parsedDetails.profileUrl = new URL(profileSrc, hospital_site).href;
        }

        parsedDetails.specialty = doctorDiv.find('h5').text().trim();

        parsedDetails.학력 = [];
        parsedDetails.경력 = [];
        parsedDetails.수상 = [];

        doctorDiv.find('.dt-sc-gynecologist-single-meta > li').each((i, el) => {
            const title = $(el).find('span').first().text().trim();
            const items = [];
            $(el).find('.child-bullet-list li').each((j, itemEl) => {
                items.push($(itemEl).text().trim().replace(/"/g, ''));
            });

            if (title === '학력') {
                items.forEach(item => parsedDetails.학력.push({ date: null, content: item }));
            } else if (title === '주요경력' || title === '현재') {
                items.forEach(item => parsedDetails.경력.push({ date: null, content: item }));
            } else if (title === '수상') {
                items.forEach(item => parsedDetails.수상.push({ date: null, content: item }));
            }
        });
        
        parsedDetails.학술 = [];
        parsedDetails.논문 = [];
        parsedDetails.언론 = [];
        parsedDetails.저서 = [];

        result = { ...result, ...parsedDetails };

    } catch (e) {
        result.error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(result));
})();
