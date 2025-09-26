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

        // Take a screenshot for debugging
        await page.screenshot({ path: `/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/services/crawling_bedoc/data/${doctorData.aiga_hid}/debug_screenshot.png` });
        console.log(`Screenshot taken: debug_screenshot.png for ${doctorData.aiga_hid}`);

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic ---

        // Extract Profile URL
        const profileImgSrc = $('div.doctor_img figure img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, doctorData.bedoc_hospitalsite).href;
        }

        // Extract Doctor Name (already have bedoc_doctorname, but confirming extraction)
        // This is just for verification, not to overwrite bedoc_doctorname
        parsedDetails.bedoc_doctorname_extracted = $('figcaption strong').text().trim();

        // Extract Specialty
        parsedDetails.specialty = $('h4:contains("전문진료과목") + p').text().trim();

        // Extract 학력 and 경력
        const eduExpText = $('h4:contains("학력 및 경력") + p').html();
        const eduExpItems = eduExpText ? eduExpText.split('<br>').map(item => item.trim()).filter(item => item !== '') : [];

        const education = [];
        const experience = [];

        eduExpItems.forEach(item => {
            const content = item.replace(/"/g, ''); // Remove double quotes
            if (content.includes('졸업') || content.includes('수료') || content.includes('박사')) {
                education.push({ date: null, content: content });
            } else {
                experience.push({ date: null, content: content });
            }            
        });

        if (education.length > 0) {
            parsedDetails.학력 = education;
        }
        if (experience.length > 0) {
            parsedDetails.경력 = experience;
        }

        // Extract 학술 (Academic Activities)
        const academicText = $('h4:contains("학회활동") + p').html();
        const academicItems = academicText ? academicText.split('<br>').map(item => item.trim()).filter(item => item !== '') : [];
        const academicActivities = academicItems.map(item => ({ date: null, content: item.replace(/"/g, '') }));

        if (academicActivities.length > 0) {
            parsedDetails.학술 = academicActivities;
        }

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    console.log(JSON.stringify({
        htmlContent: extractedHtml,
        isAttend: isAttend,
        error: error,
        ...parsedDetails
    }));
})();