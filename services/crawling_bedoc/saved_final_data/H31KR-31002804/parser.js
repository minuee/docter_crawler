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
        
        const doctorDivLocator = page.locator(`div.box-doc:has(div.name > span:text-is("${bedoc_doctorname}"))`);

        if (await doctorDivLocator.count() === 0) {
            throw new Error(`Could not find container for doctor ${bedoc_doctorname}`);
        }

        await doctorDivLocator.locator('a.more').click();
        const detailsDiv = doctorDivLocator.locator('.dr_more_info3');
        await detailsDiv.waitFor({ state: 'visible', timeout: 5000 });
        await page.waitForTimeout(1000); // wait for full render

        const html = await page.content();
        const $ = cheerio.load(html);

        const doctorDetailsContainer = $(`div.box-doc:has(div.name > span:contains("${bedoc_doctorname}"))`).find('.dr_more_info-wrap');

        let parsedDetails = {};
        parsedDetails.isAttend = true;

        const profileSrc = doctorDetailsContainer.find('.dr_more_info-head img').attr('src');
        if (profileSrc) {
            parsedDetails.profileUrl = new URL(profileSrc, hospital_site).href;
        }

        parsedDetails.specialty = doctorDetailsContainer.find('.subject').text().replace(/진료과목|\n/g, '').trim();

        parsedDetails.학력 = [];
        parsedDetails.경력 = [];
        parsedDetails.수상 = [];
        parsedDetails.저서 = [];

        doctorDetailsContainer.find('.career li').each((i, el) => {
            const text = $(el).text().trim();
            if (!text) return;

            if (text.includes('졸업') || text.includes('연수')) {
                parsedDetails.학력.push({ date: null, content: text.replace(/"/g, '') });
            } else if (text.includes('교과서 집필')) {
                 parsedDetails.저서.push({ date: null, content: text.replace(/"/g, '') });
            } else {
                parsedDetails.경력.push({ date: null, content: text.replace(/"/g, '') });
            }
        });

        doctorDetailsContainer.find('.study li').each((i, el) => {
            const text = $(el).text().trim();
            if(text) {
                parsedDetails.수상.push({ date: null, content: text.replace(/"/g, '') });
            }
        });
        
        parsedDetails.학술 = [];
        parsedDetails.논문 = [];
        parsedDetails.언론 = [];

        result = { ...result, ...parsedDetails };

    } catch (e) {
        result.error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(result));
})();
