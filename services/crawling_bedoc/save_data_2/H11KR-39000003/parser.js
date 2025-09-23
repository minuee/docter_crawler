const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function parse() {
    const url = process.argv[2];
    const doctorName = process.argv[3];

    if (!url || !doctorName) {
        console.error('URL and doctor name are required.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], 논문: [], 언론: [], 저서: [] };

    try {
        // 1. Go to the list page
        await page.goto(url, { waitUntil: 'networkidle' });

        // 2. Find the doctor and get the docId
        const doctorBlock = page.locator(`div.team:has-text("${doctorName}")`);
        if (await doctorBlock.count() === 0) {
            throw new Error(`Doctor ${doctorName} not found on the list page.`);
        }

        const detailButton = doctorBlock.locator('a.btn-info');
        const onclickAttr = await detailButton.getAttribute('onclick');
        const docIdMatch = onclickAttr.match(/showDoctorDtl\('(\d+)',/);
        if (!docIdMatch || !docIdMatch[1]) {
            throw new Error('Could not extract docId.');
        }
        const docId = docIdMatch[1];

        // 3. Construct and navigate to the detail URL
        const detailUrl = new URL(`${docId}/docDtl.do?showTab=profile`, url).href;
        await page.goto(detailUrl, { waitUntil: 'networkidle' });

        // 4. Parse the detail page
        const html = await page.content();
        const $ = cheerio.load(html);

        const profileSrc = $('div.doc-pic img.slider__images-image').attr('src');
        if (profileSrc) {
            synthesizedData.profileUrl = new URL(profileSrc, detailUrl).href;
        }
        
        synthesizedData.specialty = $('li.type:has(i.icon-stethoscope)').text().trim();

        let currentCategory = '';
        $('#tabs06 p').each((i, el) => {
            const text = $(el).text().trim();
            if (!text) return;

            if (text === '학력') {
                currentCategory = 'edu';
            } else if (text.includes('경력')) {
                currentCategory = 'exp';
            } else {
                if (currentCategory === 'edu') {
                    synthesizedData.학력.push({ content: text });
                } else if (currentCategory === 'exp') {
                    synthesizedData.경력.push({ content: text });
                }
            }
        });

        $('#tabs07 p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                synthesizedData.논문.push(text);
            }
        });

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

parse();