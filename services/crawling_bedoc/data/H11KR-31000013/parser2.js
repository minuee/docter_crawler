
const { chromium } = require('playwright');
const cheerio = require('cheerio');

// New parser for National Cancer Center, handles dynamic search.
async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser2.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let result = {};
    let error = null;

    try {
        // 1. Navigate to the page
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // 2. Type doctor's name into the search box
        await page.fill('#keyword1', bedoc_doctorname);

        // 3. Click the search button
        await page.click('#btn_search_doctor1');

        // 4. Wait for search results to appear
        await page.waitForSelector('#searchView div.ti_list', { state: 'visible', timeout: 30000 });

        // 5. Find the specific doctor and click the details link
        const doctorLocator = page.locator(`#searchView div.ti_list:has-text("${bedoc_doctorname}"):has(span.group:has-text("${doctorData.bedoc_deptname}"))`);
        const doctorCount = await doctorLocator.count();

        if (doctorCount === 0) {
            throw new Error(`Doctor '${bedoc_doctorname}' not found in search results.`);
        }

        const detailButton = doctorLocator.locator('a[onclick*="viewDetail"]');

        // 6. Handle the popup
        const [popup] = await Promise.all([
            page.waitForEvent('popup', { timeout: 15000 }),
            detailButton.click(),
        ]);

        // 7. Parse content from the popup
        await popup.waitForSelector('h1.logo:has(img[alt="국립암센터 로고"])', { state: 'visible', timeout: 60000 });
        const popupContent = await popup.content();
        const $ = cheerio.load(popupContent);

        const synthesizedData = {};
        synthesizedData.isAttend = $('body').text().includes(bedoc_doctorname);
        
        const profileSrc = $('#profilePhoto').attr('src');
        if (profileSrc) {
            synthesizedData.profileUrl = new URL(profileSrc, hospital_site).href;
        }

        synthesizedData.specialty = $('p.comment').text().trim();
        synthesizedData.학력 = [];
        synthesizedData.경력 = [];
        synthesizedData.논문 = [];
        synthesizedData.저서 = [];
        synthesizedData.수상 = [];
        synthesizedData.언론 = [];

        $('#tabCon02 table').each((i, tableEl) => {
            const summary = $(tableEl).attr('summary');
            const rows = $(tableEl).find('tbody tr');

            if (summary === '학력 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                    if (tds.length >= 4) {
                        const date = `${$(tds[0]).text().trim()} ~ ${$(tds[1]).text().trim()}`;
                        const content = `${$(tds[2]).text().trim()} ${$(tds[3]).text().trim()}`;
                        if (content.trim()) synthesizedData.학력.push({ date, content });
                    }
                });
            } else if (summary === '경력 상세보기') {
                rows.each((j, rowEl) => {
                    const tds = $(rowEl).find('td');
                     if (tds.length >= 4) {
                        const date = `${$(tds[0]).text().trim()} ~ ${$(tds[1]).text().trim()}`;
                        const content = `${$(tds[2]).text().trim()} ${$(tds[3]).text().trim()}`;
                        if (content.trim()) synthesizedData.경력.push({ date, content });
                    }
                });
            } else if (summary === '주요논문 상세보기') {
                 rows.each((j, rowEl) => {
                    const title = $(rowEl).find('a').text().trim();
                    if (title) synthesizedData.논문.push(title);
                });
            }
        });
        result = synthesizedData;

    } catch (e) {
        error = `Error during Playwright execution in parser2.js: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...result, error }));
}

main();
