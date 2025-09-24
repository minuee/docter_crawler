const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    const hospitalSite = process.argv[2];
    const doctorName = process.argv[3];

    let browser;
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
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(hospitalSite, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const html = await page.content();
        const $ = cheerio.load(html);

        if (html.includes(doctorName)) {
            result.isAttend = true;
        }

        const cleanContent = (htmlContent) => {
            if (!htmlContent) return [];
            return htmlContent.replace(/<br\s*\/?>/gi, '|||')
                              .replace(/<[^>]+>/g, '')
                              .split('|||')
                              .map(item => item.replace(/\s+/g, ' ').replace(/·/g, '').replace(/"/g, '').trim())
                              .filter(Boolean);
        };

        // Profile URL
        const profileImgSrc = $('div.profile__img img').attr('src');
        if (profileImgSrc) {
            result.profileUrl = new URL(profileImgSrc, hospitalSite).href;
        }

        // Specialty
        result.specialty = $('p.profile__department').text().trim().replace(/"/g, '');

        // Education
        const educationHtml = $('div.profile__education').html();
        result.학력 = cleanContent(educationHtml).map(content => ({ date: null, content }));

        // Career
        const careerHtml = $('div#career').html();
        result.경력 = cleanContent(careerHtml).map(content => ({ date: null, content }));
        
        // Academic Activities
        const academicHtml = $('div#schoolship').html();
        result.학술 = cleanContent(academicHtml).map(content => ({ date: null, content }));

    } catch (e) {
        result.error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    fs.writeFileSync('parser_output.json', JSON.stringify(result, null, 2));
    fs.writeFileSync('parser_status.txt', 'done');
})();