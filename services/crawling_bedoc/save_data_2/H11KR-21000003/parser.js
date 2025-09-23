const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument.');
        process.exit(1);
    }

    const outputFilePath = 'parser_output.json';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector("dl dd:has-text('스포츠손상')", { timeout: 10000 });

        const synthesizedData = { 학력: [], 경력: [], 학술: [], 논문: [], 언론: [] };

        // --- Extract static info ---
        synthesizedData.specialty = await page.locator("dl dd:has-text('스포츠손상')").innerText();
        const profileUrlSrc = await page.locator('.swiper_doc_detailImg .swiper-slide-active img').getAttribute('src');
        if(profileUrlSrc) {
            synthesizedData.profileUrl = new URL(profileUrlSrc, url).href;
        }


        // --- Click and Extract Tab Content ---

        // 학력 및 경력
        await page.click('a[href="#doc_detailsBox_tab01"]');
        await page.waitForSelector('#doc_detailsBox_tab01', { state: 'visible' });
        const edu_exp_rows = await page.locator('#doc_detailsBox_tab01 tbody tr').all();
        for(const row of edu_exp_rows) {
            const content = await row.locator('td').nth(2).innerText();
            if (content) {
                if (content.includes('졸업') || content.includes('석사') || content.includes('박사')) {
                    synthesizedData.학력.push({ date: null, content: content });
                } else {
                    const startDate = await row.locator('td').nth(0).innerText();
                    const endDate = await row.locator('td').nth(1).innerText();
                    let date = startDate;
                    if(endDate && endDate !== '현재') {
                        date = `${startDate} ~ ${endDate}`;
                    } else if (endDate === '현재') {
                         date = `${startDate} ~ 현재`;
                    }
                    synthesizedData.경력.push({ date: date || null, content: content });
                }
            }
        }

        // 학회 활동
        await page.click('a[href="#doc_detailsBox_tab02"]');
        await page.waitForSelector('#doc_detailsBox_tab02', { state: 'visible' });
        const academic_rows = await page.locator('#doc_detailsBox_tab02 tbody tr').all();
        for(const row of academic_rows) {
            const content = await row.locator('td').nth(2).innerText();
             if (content) {
                 const startDate = await row.locator('td').nth(0).innerText();
                 const endDate = await row.locator('td').nth(1).innerText();
                 let date = startDate;
                 if(endDate && endDate !== '현재') {
                     date = `${startDate} ~ ${endDate}`;
                 } else if (endDate === '현재') {
                      date = `${startDate} ~ 현재`;
                 }
                synthesizedData.학술.push({ date: date || null, content: content });
            }
        }

        // 논문
        await page.click('a[href="#doc_detailsBox_tab03"]');
        await page.waitForSelector('#doc_detailsBox_tab03', { state: 'visible' });
        const paper_rows = await page.locator('#doc_detailsBox_tab03 tbody tr').all();
        for(const row of paper_rows) {
            const year = await row.locator('td').nth(1).innerText();
            const title = await row.locator('td').nth(2).innerText();
            const journal = await row.locator('td').nth(3).innerText();
            if (title) {
                synthesizedData.논문.push(`${title} (${journal}, ${year})`);
            }
        }

        // 미디어
        await page.click('a[href="#doc_detailsBox_tab05"]');
        await page.waitForSelector('#doc_detailsBox_tab05', { state: 'visible' });
        const media_rows = await page.locator('#doc_detailsBox_tab05 tbody tr').all();
        for(const row of media_rows) {
            const issuer = await row.locator('td').nth(0).innerText();
            const text = await row.locator('td').nth(1).locator('a').innerText();
            const url = await row.locator('td').nth(1).locator('a').getAttribute('href');
            if (text) {
                synthesizedData.언론.push({ targetDate: null, type: '기사', text: text, url: url, issuer: issuer });
            }
        }

        fs.writeFileSync(outputFilePath, JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        fs.writeFileSync(outputFilePath, JSON.stringify({ error: e.message, stack: e.stack }));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
