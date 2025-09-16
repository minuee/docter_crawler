const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], 수상: [], 언론: [] };
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const doctorElement = page.locator(`text=${bedoc_doctorname}`).first();
        if (!await doctorElement.isVisible()) {
            throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
        }

        const [popup] = await Promise.all([
            page.waitForEvent('popup', { timeout: 15000 }),
            doctorElement.click()
        ]);

        if (!popup) { throw new Error('Popup window did not open.'); }

        await popup.waitForLoadState('networkidle', { timeout: 60000 });
        
        // Get all content at once, as all data is present in the DOM but hidden.
        const content = await popup.content();
        const $ = cheerio.load(content);

        // Parse basic info from #tabCon01
        synthesizedData.profileUrl = new URL($('#profilePhoto').attr('src'), hospital_site).href;
        synthesizedData.specialty = $('p.comment').text().trim();

        // Parse all tables from the detailed info tab (#tabCon02)
        $('#tabCon02 table').each((i, tableEl) => {
            const summary = $(tableEl).attr('summary');
            const rows = $(tableEl).find('tbody tr');

            if (summary === '학력 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                    const date = `${$(tds[0]).text().trim()} ~ ${$(tds[1]).text().trim()}`;
                    const content = `${$(tds[2]).text().trim()} ${$(tds[3]).text().trim()}`;
                    if (content.trim()) synthesizedData.학력.push({ date, content });
                });
            } else if (summary === '경력 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                    const date = `${$(tds[0]).text().trim()} ~ ${$(tds[1]).text().trim()}`;
                    const content = `${$(tds[2]).text().trim()} ${$(tds[3]).text().trim()}`;
                    if (content.trim()) synthesizedData.경력.push({ date, content });
                });
            } else if (summary === '주요논문 상세보기') {
                 rows.each((j, rowEl) => {
                    const title = $(rowEl).find('a').text().trim();
                    if (title) synthesizedData.논문.push(title);
                });
            } else if (summary === '저서 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                    const content = $(tds[1]).text().trim();
                    if (content) synthesizedData.저서.push(content);
                });
            } else if (summary === '수상, 서훈 및 표창 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                    const date = $(tds[3]).text().trim();
                    const content = $(tds[1]).text().trim();
                    if (content) synthesizedData.수상.push({ date, content });
                });
            } else if (summary === '홍보활동 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                    const targetDate = $(tds[3]).text().trim();
                    const text = $(tds[1]).find('a').text().trim();
                    const issuer = $(tds[2]).text().trim();
                    // The onclick attribute contains the URL, requires separate handling if needed
                    if (text) synthesizedData.언론.push({ targetDate, type: '기사', text, issuer });
                });
            }
        });

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    console.log(JSON.stringify({ ...synthesizedData, error }, null, 2));
})();