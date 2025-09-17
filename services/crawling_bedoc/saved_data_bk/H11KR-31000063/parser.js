
const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, site_type, bedoc_hospitalsite } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    let page = await context.newPage();

    let extractedHtml = null;
    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        // --- Start of "더보기" button handling (generic) ---
        const clickMoreButtons = async (currentPage) => {
            const maxClicks = 10; // Limit to prevent infinite loops
            let clickedCount = 0;
            let buttonFound = true;

            while (buttonFound && clickedCount < maxClicks) {
                buttonFound = false;
                const moreButton = await currentPage.$('button:has-text("더보기")') ||
                                   await currentPage.$('a:has-text("더보기")') ||
                                   await currentPage.$('button:has-text("더보기 +")') ||
                                   await currentPage.$('a:has-text("더보기 +")');

                if (moreButton) {
                    try {
                        await moreButton.click();
                        await currentPage.waitForTimeout(1000); // Wait for content to load
                        clickedCount++;
                        buttonFound = true;
                    } catch (clickError) {
                        console.log(`Could not click more button: ${clickError.message}`);
                        buttonFound = false;
                    }
                }
            }
        };
        // --- End of "더보기" button handling ---

        await clickMoreButtons(page); // Click more buttons on the main page

        let rawHtml = await page.content();
        let $ = cheerio.load(rawHtml);

        // Sanitize HTML (remove scripts, styles, etc.)
        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic for Kangnam Hallym Hospital ---
        // Extract Profile URL
        const profileImgSrc = $('div.pic img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        // Extract Specialty
        parsedDetails.specialty = $('article.detail .part_txt p').text().trim().replace(/"/g, '');

        // Extract 학력
        parsedDetails.학력 = [];
        $('#tab_con01 td.dw-02 p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const parts = text.split(/\s+/);
                const date = parts[0] || null;
                const content = parts.slice(1).join(' ');
                parsedDetails.학력.push({ date, content: content.replace(/"/g, '') });
            }
        });

        // Extract 경력
        parsedDetails.경력 = [];
        $('#tab_con02 td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                parsedDetails.경력.push({ date: null, content: text.replace(/"/g, '') });
            }
        });

        // Extract 학술
        parsedDetails.학술 = [];
        $('#tab_con03 td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const parts = text.split(/\s+/);
                const date = parts[1] === '~' ? `${parts[0]} ${parts[1]} ${parts[2]}` : null;
                const content = date ? parts.slice(3).join(' ') : text;
                parsedDetails.학술.push({ date, content: content.replace(/"/g, '') });
            }
        });

        // Extract 수상
        parsedDetails.수상 = [];
        $('#tab_con04 td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                parsedDetails.수상.push({ date: null, content: text.replace(/"/g, '') });
            }
        });

        // Extract 논문/저서
        parsedDetails.논문 = [];
        parsedDetails.저서 = [];
        const publicationsHtml = await page.$eval('#tab_con05 td', el => el.innerHTML);
        const publicationsText = publicationsHtml.replace(/<br>/g, '\n');
        const lines = publicationsText.split('\n').map(l => l.trim()).filter(l => l);

        let currentCategory = '';
        lines.forEach(line => {
            if (line.includes('국제학회지 발표논문') || line.includes('국내학회지 발표논문')) {
                currentCategory = '논문';
            } else if (line.includes('저서, 저술')) {
                currentCategory = '저서';
            } else if (line) {
                if (currentCategory === '논문') {
                    parsedDetails.논문.push(line.replace(/^\d+\.\s*/, '').replace(/"/g, ''));
                } else if (currentCategory === '저서') {
                    parsedDetails.저서.push({ date: null, content: line.replace(/^\d+\.\s*/, '').replace(/"/g, ''), issuer: null });
                }
            }
        });

        // 언론보도
        parsedDetails.언론 = [];
        try {
            await page.click('a[href="#tab_con06"]');
            await page.waitForSelector('#tab_con06.active', { state: 'visible', timeout: 5000 });
            const newsItems = await page.locator('#boardContents td p').all();
            for(const item of newsItems) {
                const date = await item.locator('span').innerText();
                const link = item.locator('a');
                const text = await link.innerText();
                const url = await link.getAttribute('href');
                parsedDetails.언론.push({ targetDate: date, type: '기사', text, url });
            }
        } catch(e) { /* ignore */ }

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    console.log(JSON.stringify({
        isAttend: isAttend,
        error: error,
        ...parsedDetails
    }));
})();
