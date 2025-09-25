const { chromium } = require('playwright');

(async () => {
    const hospitalSite = process.argv[2];
    const doctorName = process.argv[3];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let result = {
        isAttend: false,
        specialty: null,
        profileUrl: null,
        학력: [],
        경력: [],
        학술: [],
        논문: [],
        error: null
    };

    try {
        await page.goto(hospitalSite, { waitUntil: 'domcontentloaded', timeout: 60000 });

        if ((await page.content()).includes(doctorName)) {
            result.isAttend = true;
        }

        // Profile URL
        const profileImgSrc = await page.getAttribute('img.doc_img', 'src');
        if (profileImgSrc) {
            result.profileUrl = new URL(profileImgSrc, hospitalSite).href;
        }

        // Specialty
        result.specialty = (await page.textContent('p.subj_t')).trim();

        // History sections
        await page.waitForSelector('div._careerContainer ._careerIem', { timeout: 10000 });
        const historyData = await page.evaluate(() => {
            const data = { 학력: [], 경력: [], 학술: [] };
            document.querySelectorAll('div._careerContainer').forEach(container => {
                const title = container.querySelector('h3.cont_tit').textContent.trim();
                const items = [];
                container.querySelectorAll('td[data-key="careerSj"]').forEach(itemEl => {
                    items.push({ date: null, content: itemEl.textContent.trim().replace(/"/g, '') });
                });

                if (title === '학력') {
                    data.학력 = items;
                } else if (title === '경력') {
                    data.경력 = items;
                } else if (title === '학회활동') {
                    data.학술 = items;
                }
            });
            return data;
        });
        result.학력 = historyData.학력;
        result.경력 = historyData.경력;
        result.학술 = historyData.학술;

        // Thesis with correct pagination handling and DEBUGGING
        result.논문 = [];
        let pageCount = 1;
        const maxPages = 50; // Safety break
        while (pageCount <= maxPages) {
            console.log(`[DEBUG] Scraping page ${pageCount}...`);
            await page.waitForSelector('ul#_thesisContainer li', { timeout: 5000 });
            const pageItems = await page.evaluate(() => 
                Array.from(document.querySelectorAll('ul#_thesisContainer li span[data-key="thesisNm"]'), el => el.textContent.trim().replace(/"/g, ''))
            );
            result.논문.push(...pageItems);

            const nextButton = page.locator('a.next[data-thesispaging="next"]');
            
            if (await nextButton.count() > 0 && await nextButton.isVisible()) {
                console.log(`[DEBUG] Next button found. Clicking to go to page ${pageCount + 1}.`);
                await nextButton.click();
                await page.waitForTimeout(1500);
                pageCount++;
            } else {
                console.log("[DEBUG] Next button not found. Ending pagination.");
                break; // No more next button, exit loop
            }
        }
        if (pageCount > maxPages) {
            console.log(`[DEBUG] Reached max page limit of ${maxPages}. Stopping.`);
        }
        result.논문 = [...new Set(result.논문)]; // Use Set to ensure uniqueness

    } catch (e) {
        result.error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(result, null, 2));
})();
