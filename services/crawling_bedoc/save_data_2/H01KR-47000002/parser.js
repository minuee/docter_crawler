const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').trim() : '';
};

// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], 논문: [], 저서: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        // 1. 메인 페이지 파싱
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded' });
        let html = await page.content();
        let $ = cheerio.load(html);

        if ($('body').text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        const profileSrc = $('p.doctor_img img').attr('src');
        if (profileSrc) {
            synthesizedData.profileUrl = new URL(profileSrc, doctorData.hospital_site).href;
        }

        synthesizedData.specialty = cleanText($('div.speci p:last-child').text());

        const historyItems = [];
        $('h4.tit.h4_t:contains("학력/경력")').next('.history').find('dl').each((i, el) => {
            const date = $(el).find('dt').text().trim();
            const content = $(el).find('dd li').text().trim();
            if (content) historyItems.push({ date: date || null, content });
        });
        
        const { education, experience } = (() => {
            const edu = [];
            const exp = [];
            const eduKeywords = ['석사', '박사', '학사'];
            historyItems.forEach(item => {
                if (eduKeywords.some(keyword => item.content.includes(keyword))) edu.push(item);
                else exp.push(item);
            });
            return { education: edu, experience: exp };
        })();
        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;

        const academicActivities = [];
        $('h4.tit.h4_t:contains("학회활동")').next('.history').find('dl').each((i, el) => {
            const date = $(el).find('dt').text().trim();
            const content = $(el).find('dd li').text().trim();
            if (content) academicActivities.push({ date: date || null, content });
        });
        synthesizedData.학술 = academicActivities;

        const awards = [];
        $('h4.tit.h4_t:contains("수상")').next('.history').find('dl').each((i, el) => {
            const date = $(el).find('dt').text().trim();
            const content = $(el).find('dd li').text().trim();
            if (content) awards.push({ date: date || null, content });
        });
        synthesizedData.수상 = awards;

        // 2. 논문 페이지 파싱
        const paperUrl = $('div.con_tab li a:contains("논문")').attr('href');
        if (paperUrl) {
            await page.goto(new URL(paperUrl, doctorData.hospital_site).href, { waitUntil: 'domcontentloaded' });
            html = await page.content();
            $ = cheerio.load(html);
            $('table.table1.mt30').each((i, table) => {
                const title = $(table).find('th:contains("제목")').next('td').text().trim();
                if (title) synthesizedData.논문.push(title);
            });
        }

        // 3. 저서 페이지 파싱
        const bookUrl = $('div.con_tab li a:contains("저서")').attr('href');
        if (bookUrl) {
            await page.goto(new URL(bookUrl, doctorData.hospital_site).href, { waitUntil: 'domcontentloaded' });
            html = await page.content();
            $ = cheerio.load(html);
            $('table.table1.mt30').each((i, table) => {
                const title = $(table).find('th:contains("저서명")').next('td').text().trim();
                if (title) synthesizedData.저서.push({ content: title });
            });
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false;
    } finally {
        if (browser) { await browser.close(); }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    Object.keys(finalResult).forEach(key => { 
        if (Array.isArray(finalResult[key]) && finalResult[key].length === 0) { 
            delete finalResult[key]; 
        }
    });

    return finalResult;
}

// 메인 실행 로직
if (require.main === module) {
    const doctorFilePath = process.argv[2];
    if (!doctorFilePath) {
        console.error("Please provide the path to the doctor's JSON file.");
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Failed to read or parse file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };
            updatedDoctorData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedDoctorData.isExist = !result.error;
            updatedDoctorData.isAttend = result.isAttend;
            delete updatedDoctorData.error;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated successfully: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`A critical error occurred for ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}