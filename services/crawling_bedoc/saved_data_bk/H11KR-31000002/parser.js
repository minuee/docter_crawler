const { chromium } = require('playwright');

(async () => {
    const hospitalSite = process.argv[3] || 'https://www.cmcbucheon.or.kr/page/doctor/9/D0000989';

    const browser = await chromium.launch();
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36' });
    const page = await context.newPage();

    const synthesizedData = {};

    try {
        await page.goto(hospitalSite, { waitUntil: 'networkidle' });

        // Click all "More" buttons to expand content
        for (const moreButton of await page.locator('span.profile_view_more > a, span.more_btn > a').all()) {
            await moreButton.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500); // Wait for content to load
        }

        // --- Profile Section ---
        const profileBg = page.locator('div.cont_bg[data-img-1]');
        const profileImgPath = await profileBg.getAttribute('data-img-1');
        synthesizedData.profileUrl = new URL(profileImgPath, hospitalSite).href;
        synthesizedData.specialty = await page.locator('dl:has(dt:has-text("진료분야")) dd p').textContent();

        const parseProfileSection = async (title) => {
            const items = [];
            const elements = await page.locator(`div.cont_main_profile > div:has(> strong:text-is("${title}")) > ul > li`).all();
            for (const el of elements) {
                const date = await el.locator('dt').textContent();
                const content = await el.locator('dd').textContent();
                items.push({ date: date.trim().replace(/\s+~\s+/, ' ~ '), content: content.trim() });
            }
            return items;
        };

        synthesizedData.학력 = await parseProfileSection('학력');
        synthesizedData.경력 = await parseProfileSection('경력');
        synthesizedData.수상 = await parseProfileSection('수상이력');
        synthesizedData.학술 = await parseProfileSection('학회활동');

        // --- Thesis Section ---
        synthesizedData.논문 = [];
        const thesisElements = await page.locator('div.thesis_list ul > li').all();
        for (const el of thesisElements) {
            const title = await el.locator('.title p').textContent();
            const info = await el.locator('.info').textContent();
            synthesizedData.논문.push(`${title} (${info.trim()})`);
        }

        // --- Books Section ---
        synthesizedData.저서 = [];
        const bookElements = await page.locator('div.book_list ul > li').all();
        for (const el of bookElements) {
            const title = await el.locator('.title p').textContent();
            const info = await el.locator('.info').textContent();
            synthesizedData.저서.push(`${title} (${info.trim()})`);
        }

        // --- News Section ---
        synthesizedData.언론 = [];
        const newsElements = await page.locator('div.news_list div.grid-item').all();
        for (const el of newsElements) {
            const date = await el.locator('.date').textContent();
            const text = await el.locator('.cont_wrap p').textContent();
            const url = await el.locator('a').first().getAttribute('href');
            synthesizedData.언론.push({ targetDate: date.trim(), type: '뉴스', text: text.trim(), url });
        }

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (error) {
        console.error(`Error during parsing for ${hospitalSite}:`, error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();