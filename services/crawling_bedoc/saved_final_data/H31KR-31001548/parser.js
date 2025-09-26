
const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });
        const content = await page.content();
        const $ = cheerio.load(content);

        const imageUrl = $('#img_w20190627acec8541b7537').attr('src');

        if (imageUrl) {
            synthesizedData.profileUrl = imageUrl;
            error = 'Content is an image, text parsing not possible.';
            synthesizedData.isAttend = null; // Cannot confirm from image
        } else {
            throw new Error('Main content image not found.');
        }

    } catch (e) {
        error = `Error during Playwright execution for ${bedoc_doctorname}: ${e.message}`;
        synthesizedData.isAttend = false;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...synthesizedData, error }));
}

main();
