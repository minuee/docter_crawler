const { chromium } = require('playwright');

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

    const synthesizedData = { 언론: [], 논문: [] };

    try {
        await page.goto(hospitalSite, { waitUntil: 'networkidle' });

        // --- Get all data from the main page ---
        synthesizedData.profileUrl = new URL(await page.locator('div#doctor img').first().getAttribute('src'), hospitalSite).href;
        synthesizedData.specialty = await page.locator('dt:has-text("[전문분야]") + dd').textContent();

        const getFullUrl = (path) => new URL(path, hospitalSite).href;

        // --- Get all sub-page URLs from the main page first ---
        const bioUrl = getFullUrl(await page.locator('a[title="약력"]').getAttribute('href'));
        const mediaUrl = getFullUrl(await page.locator('a[title="언론보도"]').getAttribute('href'));
        const researchUrl = getFullUrl(await page.locator('a[title="연구"]').getAttribute('href'));

        // --- Visit pages and parse ---
        // Biography Page
        await page.goto(bioUrl, { waitUntil: 'networkidle' });
        synthesizedData.학력 = await page.locator('h4:has-text("학력") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim() })));
        synthesizedData.경력 = await page.locator('h4:has-text("경력") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim().replace(/\n/g, ' ') })));
        synthesizedData.학술 = await page.locator('h4:has-text("학회") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim().replace(/\n/g, ' ') })));

        // Media Page (with pagination)
        await page.goto(mediaUrl, { waitUntil: 'networkidle' });
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
                await page.waitForURL(/.*/, { waitUntil: 'networkidle' });
                currentPage++;
            } else {
                break;
            }
        }

        // Research Page
        await page.goto(researchUrl, { waitUntil: 'networkidle' });
        const thesisText = await page.locator('h4:has-text("논문") + ul.desc1 > li').innerHTML();
        synthesizedData.논문 = thesisText.split('<br><br>').map(item => item.replace(/<br>/g, ' ').trim()).filter(Boolean);

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (error) {
        console.error(`Error during parsing for ${hospitalSite}:`, error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
