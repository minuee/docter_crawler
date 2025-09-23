const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
    const page = await context.newPage();

    let result = {
        isAttend: false,
        specialty: null,
        profileUrl: null,
        학력: [],
        경력: [],
        학술: [],
        언론: [],
        error: null
    };

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        result.isAttend = true;

        // Profile URL from background-image style
        const bgImageStyle = $('div.section1 > div.wsize').attr('style');
        if (bgImageStyle) {
            const match = bgImageStyle.match(/url\(\'([^\']+)\'\)/) || bgImageStyle.match(/url\(([^)]+)\)/);
            if (match && match[1]) {
                const relativeUrl = match[1].replace(/['"]/g, '');
                result.profileUrl = new URL(relativeUrl, hospital_site).href;
            }
        }
        
        // Specialty
        result.specialty = $('dl.d_clinic > dd').text().trim();

        // History (Education, Career, etc.)
        $('dl.jsInfo').each((i, el) => {
            const dt = $(el).find('dt').text().trim();
            const listItems = $(el).find('dd ul li');

            if (dt.includes('경력')) {
                listItems.each((j, item) => {
                    const text = $(item).text().trim().replace(/"/g, '');
                    if (!text) return;

                    if (text.includes('대학') || text.includes('박사') || text.includes('졸업')) {
                        result.학력.push({ date: null, content: text });
                    } else {
                        result.경력.push({ date: null, content: text });
                    }
                });
            } else if (dt.includes('학회')) {
                 listItems.each((j, item) => {
                    const text = $(item).text().trim().replace(/"/g, '');
                    if (text) result.학술.push({ date: null, content: text });
                });
            } else if (dt.includes('언론')) {
                listItems.each((j, item) => {
                    const link = $(item).find('a');
                    const text = link.text().trim().replace(/"/g, '');
                    const url = link.attr('href');
                    if (text) result.언론.push({ targetDate: null, type: '기사', text, url, issuer: null });
                });
            }
        });

    } catch (e) {
        result.error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    console.log(JSON.stringify(result, null, 2));
})();