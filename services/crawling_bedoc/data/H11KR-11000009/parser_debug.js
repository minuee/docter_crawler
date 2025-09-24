const { chromium } = require('playwright');
const fs = require('fs');

const log = (msg) => fs.appendFileSync('debug_output.txt', `[${new Date().toISOString()}] ${msg}\n`);

(async () => {
    log('Script starting...');
    const doctorName = process.argv[2];
    const hospitalSite = process.argv[3];

    if (!hospitalSite) {
        log('Error: Missing arguments.');
        process.exit(1);
    }

    log(`Arguments received: doctorName=${doctorName}, hospitalSite=${hospitalSite}`);

    let browser;
    try {
        log('Launching browser...');
        browser = await chromium.launch();
        log('Browser launched.');
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36' });
        const page = await context.newPage();
        log('New page created.');

        const synthesizedData = { 언론: [], 논문: [], 학력: [], 경력: [], 학술: [] };

        log(`Navigating to initial page: ${hospitalSite}`);
        await page.goto(hospitalSite, { waitUntil: 'domcontentloaded' });
        log('Initial page loaded.');

        synthesizedData.profileUrl = new URL(await page.locator('div#doctor img').first().getAttribute('src'), hospitalSite).href;
        log(`Extracted profileUrl: ${synthesizedData.profileUrl}`);
        synthesizedData.specialty = await page.locator('dt:has-text("[전문분야]") + dd').textContent();
        log(`Extracted specialty: ${synthesizedData.specialty}`);

        const getFullUrl = (path) => new URL(path, hospitalSite).href;

        const bioUrl = getFullUrl(await page.locator('a:has-text("약력")').getAttribute('href'));
        log(`Found bioUrl: ${bioUrl}`);
        const mediaUrl = getFullUrl(await page.locator('a:has-text("언론보도")').getAttribute('href'));
        log(`Found mediaUrl: ${mediaUrl}`);
        const researchUrl = getFullUrl(await page.locator('a:has-text("연구")').getAttribute('href'));
        log(`Found researchUrl: ${researchUrl}`);

        log(`Navigating to bio page: ${bioUrl}`);
        await page.goto(bioUrl, { waitUntil: 'domcontentloaded' });
        log('Bio page loaded.');
        synthesizedData.학력 = await page.locator('h4:has-text("학력") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim() })));
        log('Extracted 학력.');
        synthesizedData.경력 = await page.locator('h4:has-text("경력") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim().replace(/\n/g, ' ') })));
        log('Extracted 경력.');
        synthesizedData.학술 = await page.locator('h4:has-text("학회") + ul > li').allTextContents().then(items => items.map(item => ({ date: null, content: item.trim().replace(/\n/g, ' ') })));
        log('Extracted 학술.');

        log(`Navigating to media page: ${mediaUrl}`);
        await page.goto(mediaUrl, { waitUntil: 'domcontentloaded' });
        log('Media page loaded.');
        let currentPage = 1;
        while (true) {
            log(`Processing media page ${currentPage}`);
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
            log(`Found ${articles.length} articles on page ${currentPage}`);

            const nextButton = page.locator(`.nav_page a:text("${currentPage + 1}")`);
            if (await nextButton.count() > 0) {
                log('Found next page button, clicking...');
                await nextButton.click();
                await page.waitForURL(/.*/, { waitUntil: 'domcontentloaded' });
                currentPage++;
            } else {
                log('No more media pages.');
                break;
            }
        }

        log(`Navigating to research page: ${researchUrl}`);
        await page.goto(researchUrl, { waitUntil: 'domcontentloaded' });
        log('Research page loaded.');
        const thesisText = await page.locator('ul.desc1 > li.text_en').innerHTML();
        synthesizedData.논문 = thesisText.split('<br>').map(item => item.replace(/■/g, '').trim()).filter(Boolean);
        log('Extracted 논문.');

        log('--- FINAL DATA ---');
        fs.writeFileSync('parser_output.json', JSON.stringify(synthesizedData, null, 2));
        log('Final data written to parser_output.json');

    } catch (error) {
        log(`Error during parsing for ${hospitalSite}: ${error.stack}`);
        process.exit(1);
    } finally {
        if (browser) {
            log('Closing browser.');
            await browser.close();
        }
        log('Script finished.');
    }
})();