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

    let synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], 학술: [], specialty: null, profileUrl: null };
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded' });
        let mainPageContent = await page.content();
        let $ = cheerio.load(mainPageContent);

        if (mainPageContent.includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = new URL($('div.department_doctor02 p img').attr('src'), doctorData.hospital_site).href;
        
        synthesizedData.specialty = $('div.department_doctor02 ul li').filter(function() {
            return $(this).text().includes('전문진료분야');
        }).text().replace('전문진료분야','').trim();

        const processBlock = (selector, keyword, content) => {
            const $content = cheerio.load(content);
            const h5 = $content('h5').filter(function() {
                return $content(this).text().includes(keyword);
            });
            const text = h5.next('div.ct_desc01').text().trim();
            return text.split('\n').map(line => line.trim().replace(/^- /, '')).filter(Boolean);
        };

        const experienceItems = processBlock('h5', '경력', mainPageContent);
        experienceItems.forEach(item => {
            if (item.includes('졸업') || item.includes('석사') || item.includes('박사')) {
                synthesizedData.학력.push({ date: null, content: item });
            } else {
                synthesizedData.경력.push({ date: null, content: item });
            }
        });

        const academicItems = processBlock('h5', '소속학회', mainPageContent);
        academicItems.forEach(item => {
            synthesizedData.학술.push({ date: null, content: item });
        });

        const researchUrl = new URL($('ul#tab_menu a[href*="act=doctorStudy"]').attr('href'), doctorData.hospital_site).href;
        if (researchUrl) {
            await page.goto(researchUrl, { waitUntil: 'domcontentloaded' });
            const researchPageContent = await page.content();
            
            const bookItems = processBlock('h5', '저서', researchPageContent);
            bookItems.forEach(item => {
                synthesizedData.저서.push({ date: null, content: item.replace(/^[0-9]+\.\s/, '') });
            });

            const thesisItems = processBlock('h5', '논문', researchPageContent);
            thesisItems.forEach(item => {
                synthesizedData.논문.push(item.replace(/^[0-9]+\.\s/, ''));
            });
        }

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
