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
        error: null
    };

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const doctorLocator = page.locator('div.doctor_box').filter({ hasText: bedoc_doctorname });
        if (await doctorLocator.count() === 0) {
            throw new Error(`Doctor '${bedoc_doctorname}' not found on the list page.`);
        }

        // 1. Extract specialty from the main page
        const specialtyText = await doctorLocator.locator('p.don_part:has(strong:text("진료분야")) > span').textContent();
        result.specialty = specialtyText.trim();

        // 2. Click the button to open the popup
        const detailButton = doctorLocator.locator('a.DoctorInfo:has-text("약력 / 학력보기")');
        await detailButton.click();

        // 3. Wait for the iframe and get its content
        const iframeSelector = 'iframe.fancybox-iframe';
        await page.waitForSelector(iframeSelector, { timeout: 10000 });
        const frame = await page.frame({ url: /doc_pop/ });
        if (!frame) {
            throw new Error("Could not access the doctor details iframe.");
        }
        const iframeHtml = await frame.content();
        const $ = cheerio.load(iframeHtml);

        result.isAttend = true;

        // 4. Extract data from the iframe
        const profileImgSrc = $('div.doc_img img').attr('src');
        if (profileImgSrc) {
            result.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        // Helper function to parse <br> separated lists
        const parseBrSeparatedList = (htmlContent) => {
            if (!htmlContent) return [];
            return htmlContent.split('<br>').map(item => item.replace(/•/g, '').trim()).filter(Boolean);
        };
        
        // 5. Robustly extract education and career
        $('p.don_part').each((i, el) => {
            const strongText = $(el).find('strong').text().trim();
            const spanHtml = $(el).find('span').html();

            if (strongText === '학력') {
                result.학력 = parseBrSeparatedList(spanHtml).map(content => ({ date: null, content: content.replace(/"/g, '') }));
            } else if (strongText === '약력') {
                result.경력 = parseBrSeparatedList(spanHtml).map(content => ({ date: null, content: content.replace(/"/g, '') }));
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
