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

    let synthesizedData = { 학력: [], 경력: [], 논문: [], 학술: [], 저서: [] };
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const $ = cheerio.load(html);

        if (html.includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = new URL($('p.dcpop_img img').attr('src'), doctorData.bedoc_hospitalsite).href;
        synthesizedData.specialty = $('dl.dcpop_case dd').text().trim();

        // Tab 1: Education and Experience
        $('#dcpop_tab01 ul.dcpop_list li').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('졸업') || text.includes('석사') || text.includes('박사') || text.includes('연수원')) {
                synthesizedData.학력.push({ date: null, content: text });
            } else {
                synthesizedData.경력.push({ date: null, content: text });
            }
        });

        // Tab 2: Papers and Books
        $('#dcpop_tab02 ul.dcpop_list li').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('(역서)') || text.includes('일조각') || text.includes('효문사') || text.includes('최신의학사')) {
                 synthesizedData.저서.push({ date: null, content: text, issuer: null });
            } else if (text) {
                synthesizedData.논문.push(text);
            }
        });

        // Tab 3: Academic Societies
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
