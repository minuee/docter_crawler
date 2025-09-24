const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const doctorName = process.argv[2];
    const hospitalSite = process.argv[3];

    if (!hospitalSite) {
        console.error('Usage: node parser.js <doctorName> <hospitalSite>');
        process.exit(1);
    }

    const browser = await chromium.launch();
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36' });
    const page = await context.newPage();

    const synthesizedData = { 언론: [], 논문: [], 학력: [], 경력: [], 학술: [] };

    try {
        await page.goto(hospitalSite, { waitUntil: 'domcontentloaded' });

        synthesizedData.profileUrl = new URL(await page.locator('div#doctor img').first().getAttribute('src'), hospitalSite).href;
        synthesizedData.specialty = await page.locator('dt:has-text("[전문분야]") + dd').textContent();

        const getFullUrl = (path) => new URL(path, hospitalSite).href;

        // Biography Page (Optional)
        const bioLocator = page.locator('a:has-text("약력")');
        if (await bioLocator.count() > 0) {
            const bioUrl = getFullUrl(await bioLocator.getAttribute('href'));
            await page.goto(bioUrl, { waitUntil: 'domcontentloaded' });
            synthesizedData.학력 = await page.locator('h4:has-text("학력") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim() })));
            synthesizedData.경력 = await page.locator('h4:has-text("경력") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim().replace(/\n/g, ' ') })));
            synthesizedData.학술 = await page.locator('h4:has-text("학회") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim().replace(/\n/g, ' ') })));
        }

        // Media Page (Optional)
        const mediaLocator = page.locator('a:has-text("언론보도")');
        if (await mediaLocator.count() > 0) {
            const mediaUrl = getFullUrl(await mediaLocator.getAttribute('href'));
            await page.goto(mediaUrl, { waitUntil: 'domcontentloaded' });
            let currentPage = 1;
            while (true) {
                const articles = await page.locator('div.medi_list03 > ul > li').all();
                for (const article of articles) {
                    const rawText = await article.textContent();
                    const typeMatch = rawText.match(/.*\[(.*?)\].*/);
                    const type = typeMatch ? typeMatch[1] : null;
                    const text = await article.locator('a').textContent();
                    const urlScript = await article.locator('a').getAttribute('href');
                    const urlMatch = urlScript.match(/goUrl\('(.*?)'\)/);
                    const url = urlMatch ? urlMatch[1] : null;
                    const issuer = await article.locator('span').textContent();
                    synthesizedData.언론.push({ targetDate: null, type, text: text.trim(), url, issuer: issuer.trim() });
                }

                const nextButton = page.locator(`.nav_page a:text("${currentPage + 1}")`);
                if (await nextButton.count() > 0) {
                    await nextButton.click();
                    await page.waitForURL(/.*/, { waitUntil: 'domcontentloaded' });
                    currentPage++;
                } else {
                    break;
                }
            }
        }

        // Research Page (Optional)
        const researchLocator = page.locator('a:has-text("연구")');
        if (await researchLocator.count() > 0) {
            const researchUrl = getFullUrl(await researchLocator.getAttribute('href'));
            await page.goto(researchUrl, { waitUntil: 'domcontentloaded' });
            const thesisText = await page.locator('ul.desc1 > li.text_en').innerHTML();
            synthesizedData.논문 = thesisText.split('<br>').map(item => item.replace(/■/g, '').trim()).filter(Boolean);
        }

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (error) {
        console.error(`Error during parsing for ${hospitalSite}:`, error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();