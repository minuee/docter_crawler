
const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;
    const doctorNameSpaced = bedoc_doctorname.split('').join(' '); // 임석원 -> 임 석 원

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });
        const content = await page.content();
        const $ = cheerio.load(content);

        synthesizedData.isAttend = false;
        synthesizedData.학력 = [];
        synthesizedData.경력 = [];
        synthesizedData.수상 = [];
        synthesizedData.학술 = [];

        // Find the doctor's section
        const doctorLi = $(".aa_01_text li:contains('" + doctorNameSpaced + "')");

        if (doctorLi.length > 0) {
            synthesizedData.isAttend = true;
            const doctorSection = doctorLi.closest('.a_01');

            const profileImgSrc = doctorSection.find('.aa_01 img').attr('src');
            if (profileImgSrc) {
                synthesizedData.profileUrl = new URL(profileImgSrc, hospital_site).href;
            }

            doctorLi.parent().find('li').each((i, li) => {
                const text = $(li).text().trim();
                if (i === 0 || !text) return; // Skip name line and empty lines

                if (text.includes('수상')) {
                    synthesizedData.수상.push({ content: text });
                } else if (text.includes('학위') || text.includes('연수') || text.includes('대학')) {
                     synthesizedData.학력.push({ content: text });
                } else if (text.includes('회장') || text.includes('위원') || text.includes('학회')) {
                    synthesizedData.학술.push({ content: text });
                } else {
                    synthesizedData.경력.push({ content: text });
                }
            });
        } else {
             throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
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
