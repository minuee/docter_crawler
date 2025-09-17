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
        
        const doctorDiv = $(`div.doctor:has(p.name_fontload:contains("${bedoc_doctorname}"))`);

        if (doctorDiv.length > 0) {
            parsedDetails.isAttend = true;
        } else {
            parsedDetails.isAttend = false;
            throw new Error(`Could not find container for doctor ${bedoc_doctorname}`);
        }

        const profileSrc = doctorDiv.find('dt.fl img').attr('src');
        if (profileSrc) {
            parsedDetails.profileUrl = new URL(profileSrc, hospital_site).href;
        }

        parsedDetails.학력 = [];
        parsedDetails.경력 = [];
        parsedDetails.학술 = [];
        parsedDetails.저서 = [];

        doctorDiv.find('table td').each((i, el) => {
            const text = $(el).text().trim().replace(/\n/g, ' ').trim();

            if (text.includes('졸업')) {
                parsedDetails.학력.push({ date: null, content: text.replace(/"/g, '') });
            } else if (text.includes('교과서 편찬')) {
                parsedDetails.저서.push({ date: null, content: text.replace(/"/g, '') });
            } else if (text.includes('연구업적:')) {
                parsedDetails.학술.push({ date: null, content: text.replace('연구업적:', '').trim().replace(/"/g, '') });
            } else {
                parsedDetails.경력.push({ date: null, content: text.replace(/"/g, '') });
            }
        });
        
        parsedDetails.specialty = '';
        parsedDetails.논문 = [];
        parsedDetails.수상 = [];
        parsedDetails.언론 = [];

        result = { ...result, ...parsedDetails };

    } catch (e) {
        result.error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(result));
})();
