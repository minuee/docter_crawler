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

    let synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], 학술: [], 언론: [], specialty: null, profileUrl: null };
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded' });
        const mainPageContent = await page.content();
        const $ = cheerio.load(mainPageContent);
        const baseUrl = 'https://www.kcch.re.kr';

        if (mainPageContent.includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // Profile URL
        const profileImgSrc = $('div.doc_details_img .swiper-slide-active img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, baseUrl).href;
        }

        // Specialty
        synthesizedData.specialty = $('dl.txt:contains("전문분야") dd').text().trim();

        // Education and Career
        $('#doc_detailsBox_tab01 tbody tr').each((i, row) => {
            const cells = $(row).find('td');
            const startDate = $(cells[0]).text().trim();
            const endDate = $(cells[1]).text().trim();
            const content = $(cells[2]).text().trim();
            const date = endDate === '현재' ? `${startDate}~현재` : (startDate && endDate ? `${startDate}~${endDate}`: startDate);

            if (content.includes('석사') || content.includes('박사') || content.includes('졸업')) {
                synthesizedData.학력.push({ date: date || null, content });
            } else {
                synthesizedData.경력.push({ date: date || null, content });
            }
        });

        // Academic Activities
        $('#doc_detailsBox_tab02 tbody tr').each((i, row) => {
            const cells = $(row).find('td');
            const startDate = $(cells[0]).text().trim();
            const endDate = $(cells[1]).text().trim();
            const content = $(cells[2]).text().trim();
            const date = endDate === '현재' ? `${startDate}~현재` : (startDate && endDate ? `${startDate}~${endDate}`: startDate);
            synthesizedData.학술.push({ date: date || null, content });
        });

        // Publications
        $('#doc_detailsBox_tab03 tbody tr').each((i, row) => {
            const cells = $(row).find('td');
            const year = $(cells[1]).text().trim();
            const title = $(cells[2]).text().trim();
            const journal = $(cells[3]).text().trim();
            synthesizedData.논문.push(`${title} (${journal}, ${year}년)`);
        });

        // Media
        $('#doc_detailsBox_tab05 tbody tr').each((i, row) => {
            const cells = $(row).find('td');
            const media = $(cells[0]).text().trim();
            const title = $(cells[1]).text().trim();
            const url = $(cells[1]).find('a').attr('href');
            synthesizedData.언론.push({ targetDate: null, type: media, text: title, url: url ? url : null, issuer: media });
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
