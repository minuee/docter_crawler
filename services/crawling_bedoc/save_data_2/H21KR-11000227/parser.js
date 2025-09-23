const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, bedoc_deptname, aiga_hid } = doctorData;

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
        page.setDefaultTimeout(60000); // Set default timeout for Playwright operations
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        // Take a screenshot for debugging
        await page.screenshot({ path: `/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/services/crawling_bedoc/data/${aiga_hid}/debug_screenshot.png` });
        console.log(`Screenshot taken: debug_screenshot.png for ${aiga_hid}`);

        const rawHtml = await page.content(); // Get full HTML content
        const $ = cheerio.load(rawHtml);

        let targetDoctorDrtxtElement = null;
        $('div.drtxt').each((i, el) => {
            const doctorNameElement = $(el).find('div.drname');
            const doctorNameInBlock = doctorNameElement.text().replace(doctorNameElement.find('span').text(), '').trim(); // Get name without title
            
            if (doctorNameInBlock.includes(bedoc_doctorname)) {
                targetDoctorDrtxtElement = $(el);
                return false; // Break the loop
            }
        });

        if (targetDoctorDrtxtElement) {
            isAttend = true; // Doctor found on the page

            // Extract Name and Title from drtxt block
            parsedDetails.bedoc_doctorname_extracted = targetDoctorDrtxtElement.find('div.drname').text().replace(targetDoctorDrtxtElement.find('div.drname span').text(), '').trim();
            parsedDetails.title = targetDoctorDrtxtElement.find('div.drname span').text().trim();

            // Extract Qualifications (t1)
            parsedDetails.qualifications = targetDoctorDrtxtElement.find('ul.mt10 li.t1').text().trim();

            // Extract Specialty (t2)
            parsedDetails.specialty = targetDoctorDrtxtElement.find('ul.mt10 li.t2').text().trim().replace(/\s+/g, ' ').replace(/<br>/g, ', ');

            // --- Extract 학력, 경력, 학술 from the entire rawHtml using more robust regex ---
            const fullPageText = $.text(); // Get all text content from the loaded HTML

            // Extract Biography (약력) and separate into 학력 and 경력
            const biographyMatch = fullPageText.match(/약력\s*\n(.*?)(?=\n\s*학회활동|\n\s*수상경력|\n\s*학술활동|\n\s*편저서|\n\s*전문진료센터)/s);
            if (biographyMatch) {
                const bioContent = biographyMatch[1].trim();
                const bioItems = bioContent.split(/\n\s*\+\s*\n\s*-\s*\n/).map(item => item.trim()).filter(item => item !== '');
                
                const education = [];
                const experience = [];

                bioItems.forEach(item => {
                    const content = item.replace(/"/g, '');
                    if (content.includes('대학교') || content.includes('대학원') || content.includes('수료') || content.includes('졸업') || content.includes('박사')) {
                        education.push({ date: null, content: content });
                    } else {
                        experience.push({ date: null, content: content });
                    }
                });
                if (education.length > 0) parsedDetails.학력 = education;
                if (experience.length > 0) parsedDetails.경력 = experience;
            }

            // Extract Academic Activities (학회활동) as 학술
            const academicActivitiesMatch = fullPageText.match(/학회활동\s*\n(.*?)(?=\n\s*수상경력|\n\s*학술활동|\n\s*편저서|\n\s*전문진료센터)/s);
            if (academicActivitiesMatch) {
                const academicContent = academicActivitiesMatch[1].trim();
                const academicItems = academicContent.split(/\n\s*\+\s*\n\s*-\s*\n/).map(item => item.trim()).filter(item => item !== '');
                parsedDetails.학술 = academicItems.map(item => ({ date: null, content: item.trim().replace(/"/g, '') })).filter(item => item.content !== '');
            }

        } else {
            isAttend = false;
            error = `Doctor ${bedoc_doctorname} not found on the page.`;
        }

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    console.log(JSON.stringify({
        htmlContent: extractedHtml, // This will be null as we are using Cheerio
        isAttend: isAttend,
        error: error,
        ...parsedDetails
    }));
})();