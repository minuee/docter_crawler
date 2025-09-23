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

        const doctorDiv = $(`div.doctor:has(div.namecard img[alt*="${bedoc_doctorname}"])`);

        if (doctorDiv.length > 0) {
            parsedDetails.isAttend = true;
        } else {
            parsedDetails.isAttend = false;
            throw new Error(`Could not find container for doctor ${bedoc_doctorname}`);
        }

        const profileSrc = doctorDiv.find('.doctor_img img').first().attr('src');
        if (profileSrc) {
            parsedDetails.profileUrl = new URL(profileSrc, hospital_site).href;
        }

        parsedDetails.학력 = [];
        parsedDetails.경력 = [];
        parsedDetails.학술 = [];
        
        doctorDiv.find('dl.profile dd').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                parsedDetails.경력.push({ date: null, content: text.replace(/"/g, '') });
            }
        });

        doctorDiv.find('dl.achievement dd').each((i, el) => {
            const text = $(el).text().trim().replace(/\n|\r/g, ' ');
            if (text) {
                parsedDetails.학술.push({ date: null, content: text.replace(/"/g, '') });
            }
        });
        
        parsedDetails.specialty = '';
        parsedDetails.논문 = [];
        parsedDetails.수상 = [];
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
