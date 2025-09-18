
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
        // 1. Navigate to the list page
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // 2. Find the doctor's link and get the detail URL
        const doctorLinkLocator = page.locator(`ul.doctor li a:has-text("${bedoc_doctorname}")`).first();
        if (await doctorLinkLocator.count() === 0) {
            throw new Error(`Doctor link for ${bedoc_doctorname} not found on the list page.`);
        }
        const detailHref = await doctorLinkLocator.getAttribute('href');
        const detailUrl = new URL(detailHref, hospital_site).href;

        // 3. Navigate to the detail page
        await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 });
        const content = await page.content();
        const $ = cheerio.load(content);

        // 4. Parse the detail page
        synthesizedData.isAttend = true;
        synthesizedData.specialty = $('.doctor-info .short-desc').text().trim();

        const bgStyle = $('.doctor-bg').attr('style');
        const profileUrlMatch = bgStyle ? bgStyle.match(/url\(\'(.+?)\'\)/) : null;
        if (profileUrlMatch && profileUrlMatch[1]) {
            synthesizedData.profileUrl = new URL(profileUrlMatch[1], detailUrl).href;
        }

        synthesizedData.학력 = [];
        synthesizedData.경력 = [];
        synthesizedData.학술 = [];

        $('.doctor-info h5').each((i, h5) => {
            const title = $(h5).text().trim();
            const listItems = $(h5).next('ul').find('li');

            listItems.each((j, li) => {
                const fullText = $(li).text().trim();
                if (!fullText) return;

                if (title === '약력' || title === '현재') {
                    if (fullText.includes('졸업') || fullText.includes('대학')) {
                        synthesizedData.학력.push({ content: fullText });
                    } else {
                        synthesizedData.경력.push({ content: fullText });
                    }
                } else if (title === '강연 및 연구활동') {
                    const date = $(li).find('span.bold').text().trim().replace('년','');
                    $(li).find('span.bold').remove();
                    const content = $(li).html().split('<br>').map(item => item.trim()).filter(item => item).join(', ');
                    synthesizedData.학술.push({ date: date || null, content });
                }
            });
        });

    } catch (e) {
        error = `Error during Playwright execution for ${bedoc_doctorname}: ${e.message}`;
        synthesizedData.isAttend = false;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...synthesizedData, error }));
}

main();
