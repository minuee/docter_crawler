const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const hospitalSite = process.argv[2];
    const doctorName = process.argv[3];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let result = {
        isAttend: false,
        specialty: null,
        profileUrl: null,
        학력: [],
        경력: [],
        학술: [],
        error: null
    };

    try {
        await page.goto(hospitalSite, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const html = await page.content();
        const $ = cheerio.load(html);

        if (html.includes(doctorName)) {
            result.isAttend = true;
        }

        const cleanContent = (htmlContent) => {
            if (!htmlContent) return [];
            // Replace <br> with a unique separator, remove all other HTML tags, then split.
            return htmlContent.replace(/<br\s*\/?>/gi, '|||')
                              .replace(/<[^>]+>/g, '')
                              .split('|||')
                              .map(item => item.replace(/\s+/g, ' ').replace(/-/g, '').replace(/"/g, '').trim())
                              .filter(Boolean);
        };

        // Profile URL
        const profileImgSrc = $('div.profile-img img').attr('src');
        if (profileImgSrc) {
            result.profileUrl = new URL(profileImgSrc, hospitalSite).href;
        }

        // Specialty
        result.specialty = $('p.detail').text().trim().replace(/"/g, '');

        // Education
        const educationHtml = $('div.education').html();
        result.학력 = cleanContent(educationHtml).map(content => ({ date: null, content }));

        // Career (is in the first visible tab)
        const careerHtml = $('.profile__tab__cont > div:nth-child(1) > .career').html();
        result.경력 = cleanContent(careerHtml).map(content => ({ date: null, content }));
        
        // Click the "Academic Activities" tab
        await page.click('ul.profile__tab__btn li:nth-child(2)');
        await page.waitForTimeout(500); // Wait for tab content to potentially load

        // Get content after click
        const academicHtml = await page.evaluate(() => {
            const academicTabPanel = document.querySelector('.profile__tab__cont > div:nth-child(2)');
            return academicTabPanel ? academicTabPanel.innerHTML : '';
        });
        
        const $academic = cheerio.load(academicHtml);
        const academicContentHtml = $academic('.career').html();
        result.학술 = cleanContent(academicContentHtml).map(content => ({ date: null, content }));


    } catch (e) {
        result.error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(result, null, 2));
})();