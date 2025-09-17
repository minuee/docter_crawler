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
    const context = await browser.newContext();
    const page = await context.newPage();

    let result = {};
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const doctorLocator = page.locator(`li:has(h6.dt-name > b:text-is("${bedoc_doctorname}"))`);
        if (await doctorLocator.count() === 0) {
            throw new Error(`Doctor ${bedoc_doctorname} not found on list page.`);
        }

        const detailButton = doctorLocator.locator('a.docter-btn7');
        await detailButton.click();

        // Wait for the modal specified by the user
        await page.waitForSelector('#docter7', { state: 'visible', timeout: 10000 });

        const modalContent = await page.innerHTML('#docter7');
        const $ = cheerio.load(modalContent);

        const isAttend = true; // We found the doctor

        // Profile URL from background-image
        let profileUrl = null;
        const style = $('li[style*="background-image"]').attr('style');
        if (style) {
            const urlMatch = style.match(/url\(([^)]+)\)/);
            if (urlMatch && urlMatch[1]) {
                profileUrl = new URL(urlMatch[1], hospital_site).href;
            }
        }

        const specialty = $('h6.sub:contains("전문진료과목")').parent().text().replace('전문진료과목','').trim();

        const 학력 = [];
        const 경력 = [];
        const 학술 = [];
        const 수상 = [];

        $('h6.sub:contains("약력 및 경력")').parent().nextAll('li').each((i, el) => {
            const text = $(el).text().trim().replace(/^ㆍ\s*/, '');
            if (!text) return;

            if (text.includes('졸업') || text.includes('석사') || text.includes('박사')) {
                학력.push({ date: null, content: text });
            } else if (text.includes('학회') || text.includes('회장') || text.includes('위원')) {
                학술.push({ date: null, content: text });
            } else if (text.includes('수상')) {
                수상.push({ date: null, content: text });
            } else {
                경력.push({ date: null, content: text });
            }
        });

        result = {
            isAttend,
            profileUrl,
            specialty,
            학력,
            경력,
            학술,
            수상,
        };

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...result, error }));
}

main();