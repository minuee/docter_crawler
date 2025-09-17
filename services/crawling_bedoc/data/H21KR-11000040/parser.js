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

        // Helper function to parse <br> separated lists from HTML content
        const parseBrSeparatedList = (htmlContent) => {
            if (!htmlContent) return [];
            return htmlContent.split('<br>').map(item => item.replace(/-/g, '').trim()).filter(Boolean);
        };

        // Profile URL
        const profileImgSrc = $('div.profile__img img').attr('src');
        if (profileImgSrc) {
            result.profileUrl = new URL(profileImgSrc, hospitalSite).href;
        }

        // Specialty
        result.specialty = $('p.profile__department').text().trim();

        // Education
        const educationHtml = $('div.profile__education').html();
        result.학력 = parseBrSeparatedList(educationHtml).map(content => ({ date: null, content: content.replace(/"/g, '') }));

        // Career
        const careerHtml = $('div#career').html();
        result.경력 = parseBrSeparatedList(careerHtml).map(content => ({ date: null, content: content.replace(/"/g, '') }));
        
        // Academic Activities
        const schoolshipHtml = $('div#schoolship').html();
        result.학술 = parseBrSeparatedList(schoolshipHtml).map(content => ({ date: null, content: content.replace(/"/g, '') }));


    } catch (e) {
        result.error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(result, null, 2));
})();