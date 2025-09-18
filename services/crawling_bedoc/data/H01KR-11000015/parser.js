const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, site_type } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let extractedHtml = null;
    let isAttend = false;
    let error = null;
    let parsedDetails = {}; // Object to store parsed details

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        const doctorName = doctorData.bedoc_doctorname;
        let contentPage = page;

        const rawHtml = await contentPage.content();
        // console.log(rawHtml); // Log raw HTML for debugging
        const $ = cheerio.load(rawHtml);

        // Remove unwanted elements before extracting body HTML
        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(doctorName)) {
            isAttend = true;
        }

        // --- Start of detailed parsing logic ---

        // Extract Profile URL
        const profileImgSrc = $('.profile .photo img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
        }

        // Extract Specialty
        parsedDetails.specialty = $('.info p').first().text().trim();

        // Initialize arrays
        parsedDetails.학력 = [];
        parsedDetails.경력 = [];
        parsedDetails.학술 = [];
        parsedDetails.논문 = [];
        parsedDetails.언론 = [];

        // Parse Education, Experience, and Academic Activities from the first tab
        $('#tab-info01 .heading-depth04').each((i, el) => {
            const heading = $(el).find('h4.title').text().trim();
            const listItems = $(el).next('ul.list').find('li').map((j, li) => $(li).text().trim().replace(/"/g, '')).get();

            if (heading === '학력사항') {
                listItems.forEach(item => parsedDetails.학력.push({ date: null, content: item }));
            } else if (heading === '교육 및 연구경력') {
                listItems.forEach(item => parsedDetails.경력.push({ date: null, content: item }));
            } else if (heading === '기타 학술 관련 경력') {
                listItems.forEach(item => parsedDetails.학술.push({ date: null, content: item }));
            }
        });

        // Parse Theses from the second tab
        $('#tab-info02 .list li').each((i, el) => {
            const text = $(el).text().trim().replace(/"/g, '');
            if (text) {
                parsedDetails.논문.push(text);
            }
        });
        
        // Set 저서 to 논문 as they are the same in the current parser
        parsedDetails.저서 = parsedDetails.논문;

        // Parse Media Coverage from the third tab
        $('#tab-info03 #pressList li').each((i, el) => {
            const link = $(el).find('a');
            const text = link.text().trim().replace(/"/g, '');
            const url = link.attr('href');
            const date = $(el).find('span').text().trim();
            if (text) {
                parsedDetails.언론.push({
                    targetDate: date || null,
                    type: null,
                    text: text,
                    url: url ? new URL(url, doctorData.hospital_site).href : null,
                    issuer: null
                });
            }
        });

        // --- End of detailed parsing logic ---

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    // Merge parsedDetails into the final output
    console.log(JSON.stringify({
        htmlContent: extractedHtml,
        isAttend: isAttend,
        error: error,
        ...parsedDetails // Add all parsed details here
    }));
})();