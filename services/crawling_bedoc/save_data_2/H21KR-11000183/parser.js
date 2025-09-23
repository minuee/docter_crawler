const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let result = { error: null };

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForTimeout(3000);

        const doctorButton = await page.locator(`button:has-text("${bedoc_doctorname}")`);
        if (await doctorButton.count() > 0) {
            await doctorButton.click();
            await page.waitForTimeout(2000); // Wait for re-render
        }

        const html = await page.content();
        const $ = cheerio.load(html);

        let parsedDetails = {};
        parsedDetails.isAttend = $('body').text().includes(bedoc_doctorname);

        const card = $('div.hospital_doctor_card__2LHYn');

        const profileSrc = card.find('img.hospital_doctor__NITaw').attr('src');
        if (profileSrc) {
            parsedDetails.profileUrl = new URL(profileSrc, hospital_site).href;
        }

        parsedDetails.specialty = ''; // No specific specialty field found
        parsedDetails.학력 = [];
        parsedDetails.경력 = [];

        const careerText = card.find('div.hospital_career__LSCB7').text();
        const lines = careerText.split(/\r\n|\n/).map(line => line.trim()).filter(Boolean);

        lines.forEach(line => {
            if (line.includes('졸업') || line.includes('이수') || line.includes('취득')) {
                parsedDetails.학력.push({ date: null, content: line.replace(/"/g, '') });
            } else {
                parsedDetails.경력.push({ date: null, content: line.replace(/"/g, '') });
            }
        });

        // Ensure all keys exist
        parsedDetails.논문 = [];
        parsedDetails.수상 = [];
        parsedDetails.학술 = [];
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