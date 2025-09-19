const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').trim() : '';
};

// 학력/경력 분류 함수
const parseHistory = (items) => {
    const education = [];
    const experience = [];
    const eduKeywords = ['석사', '박사', '학사'];

    items.forEach(item => {
        if (eduKeywords.some(keyword => item.content.includes(keyword))) {
            education.push(item);
        } else {
            experience.push(item);
        }
    });
    return { education, experience };
};


// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });
        const html = await page.content();
        const $ = cheerio.load(html);

        if ($('body').text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        const profileSrc = $('p.pic img').attr('src');
        if (profileSrc) {
            synthesizedData.profileUrl = new URL(profileSrc, doctorData.hospital_site).href;
        }

        const specialties = [];
        $('h4.tit:contains("연구, 관심분야")').nextUntil('h4').filter('ul.list').find('li').each((i, el) => {
            specialties.push($(el).text().trim());
        });
        synthesizedData.specialty = specialties.join(', ');

        const parseTable = (title) => {
            const items = [];
            $('h4.tit').filter((i, el) => $(el).text().trim() === title)
                .next('table.table1').find('tbody tr').each((i, tr) => {
                    const date = $(tr).find('th').text().trim();
                    const content = $(tr).find('td').text().trim();
                    if (content) {
                        items.push({ date: date || null, content });
                    }
            });
            return items;
        };

        synthesizedData.학력 = parseTable('학력');
        synthesizedData.경력 = parseTable('경력');
        synthesizedData.학술 = parseTable('학회활동');

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