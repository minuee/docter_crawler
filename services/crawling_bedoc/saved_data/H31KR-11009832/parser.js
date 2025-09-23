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
        await page.goto(url, { waitUntil: 'networkidle' });

        // 1. Click the doctor's name in the pagination
        const doctorPaginationButton = page.locator(`div.s2_doc-swiper-pagination span:has-text("${doctorName}")`).first();
        if (await doctorPaginationButton.count() === 0) {
            throw new Error(`Could not find pagination button for doctor ${doctorName}`);
        }
        await doctorPaginationButton.click();

        // 2. Wait for the slide transition
        await page.waitForTimeout(1000);

        // 3. Find the active slide that contains the doctor's name
        const activeSlideLocator = page.locator(`div.swiper-slide-active:has(strong.bold:has-text("${doctorName}"))`);
        if (await activeSlideLocator.count() === 0) {
            throw new Error(`Could not find active slide for doctor ${doctorName}`);
        }

        // 4. Get the HTML of the active slide and parse it
        const slideHtml = await activeSlideLocator.innerHTML();
        const $ = cheerio.load(slideHtml);

        const profileSrc = $('.img_wrap img').attr('src');
        if (profileSrc) {
            synthesizedData.profileUrl = new URL(profileSrc, url).href;
        }

        synthesizedData.specialty = $('.big p').text().replace('진료과목','').trim();

        const historyItems = [];
        $('.list_wrap ul li.list_con').each((i, el) => {
            historyItems.push($(el).text().trim());
        });

        const eduKeywords = ['대학교', '대학원', '박사', '석사', '학사', '연구원'];
        const experience = [];
        const education = [];

        historyItems.forEach(item => {
            if (eduKeywords.some(keyword => item.includes(keyword))) {
                education.push({ content: item });
            } else {
                experience.push({ content: item });
            }
        });

        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

parse();