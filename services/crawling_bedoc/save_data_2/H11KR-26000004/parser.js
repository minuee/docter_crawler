const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

(async () => {
    const doctorDataPath = process.argv[2];
    if (!doctorDataPath) {
        console.error('Please provide the path to the doctor\'s JSON file.');
        process.exit(1);
    }
    const doctorData = JSON.parse(fs.readFileSync(doctorDataPath, 'utf-8'));

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    let synthesizedData = { 학력: [], 경력: [], 논문: [], 학술: [] };
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded' });

        const doctorElement = await page.locator(`//p[@class='dcname' and strong/text()='${doctorData.bedoc_doctorname}']`).first();
        if (!doctorElement) {
            throw new Error(`Doctor ${doctorData.bedoc_doctorname} not found on the list page.`);
        }

        const profileButton = await doctorElement.locator(`//ancestor::div[@class='doctor-profile']/following-sibling::div[@class='doctor-btnarea']//a[contains(span, '의료진 소개')]`).first();
        if (!profileButton) {
            throw new Error(`Profile button for doctor ${doctorData.bedoc_doctorname} not found.`);
        }

        const [popup] = await Promise.all([
            context.waitForEvent('page'),
            profileButton.click(),
        ]);

        await popup.waitForLoadState('domcontentloaded');
        const popupHtml = await popup.evaluate(() => document.body.innerHTML);
        const $ = cheerio.load(popupHtml);

        if (popupHtml.includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = new URL($('p.dcpop_img img').attr('src'), doctorData.bedoc_hospitalsite).href;
        synthesizedData.specialty = $('dl.dcpop_case dd').text().trim();

        $('#dcpop_tab01 ul.dcpop_list li').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('졸업') || text.includes('석사') || text.includes('박사') || text.includes('연수')) {
                synthesizedData.학력.push({ date: null, content: text });
            } else {
                synthesizedData.경력.push({ date: null, content: text });
            }
        });

        $('#dcpop_tab02 ul.dcpop_list li').each((i, el) => {
            const text = $(el).text().trim();
            if(text) synthesizedData.논문.push(text);
        });

        $('#dcpop_tab03 ul.dcpop_list li').each((i, el) => {
            const text = $(el).text().trim();
            if(text) synthesizedData.학술.push({ date: null, content: text });
        });

        const finalData = { 
            ...doctorData, 
            ...synthesizedData, 
            isSearchType: 'html_playwright', 
            isExist: true, 
            isAttend: isAttend, 
            error: null 
        };

        fs.writeFileSync(doctorDataPath, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`File updated successfully: ${doctorDataPath}`);

    } catch (e) {
        const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: e.message };
        fs.writeFileSync(doctorDataPath, JSON.stringify(errorData, null, 2), 'utf-8');
        console.error(`Error processing ${doctorData.bedoc_doctorname}: ${e.message}`);
    } finally {
        await browser.close();
    }
})();