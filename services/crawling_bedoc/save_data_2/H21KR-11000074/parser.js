
const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').trim() : '';
};

// 학력/경력/학술 분리 함수
const categorizeHistory = (items) => {
    const education = [];
    const experience = [];
    const academic = [];

    const eduKeywords = ['졸업', '수료', '학사', '석사', '박사'];
    const academicKeywords = ['회원', '학회', '위원'];

    items.forEach(item => {
        const content = item.content;
        if (eduKeywords.some(keyword => content.includes(keyword))) {
            education.push(item);
        } else if (academicKeywords.some(keyword => content.includes(keyword))) {
            academic.push(item);
        } else {
            experience.push(item);
        }
    });

    return { education, experience, academic };
};


// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 언론: [], 논문: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const $ = cheerio.load(html);

        // isAttend 체크
        if ($('body').text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 프로필 이미지 (해당 페이지에는 없음)

        // 진료과목
        synthesizedData.specialty = cleanText($('div.diagnosis_text').text().replace(/\s/g, ''));

        // 학력, 경력, 학술
        const historyItems = [];
        $('div.Education_list ul li').each((i, el) => {
            // 'KBO 필드닥터'와 같이 이미지가 포함된 경우 text()로 가져오면 이미지가 누락됨
            // html()로 가져온 후 태그를 제거하고 텍스트만 합치는 방식
            const itemHtml = $(el).html();
            const itemText = cleanText($(el).text());
            if (itemText) {
                historyItems.push({ date: null, content: itemText });
            }
        });

        const { education, experience, academic } = categorizeHistory(historyItems);
        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;
        synthesizedData.학술 = academic;

        // 논문
        $('ul.lists li.lists__item_first').each((i, el) => {
            const paper = cleanText($(el).text());
            if (paper) {
                synthesizedData.논문.push(paper.startsWith('- ') ? paper.substring(2) : paper);
            }
        });

        // 언론
        $('div.news_box figure').each((i, el) => {
            const type = cleanText($(el).find('div.title').text());
            const targetDate = cleanText($(el).find('div.day').text());
            const issuer = cleanText($(el).find('div.header').text());
            const text = cleanText($(el).find('div.text').text());
            const url = $(el).find('figcaption a').attr('href');

            if (text) {
                synthesizedData.언론.push({ targetDate, type, text, url, issuer });
            }
        });

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
    } finally {
        if (browser) { await browser.close(); }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    // 빈 배열은 삭제
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
            // isAttend는 result에서 직접 가져옴
            updatedDoctorData.isAttend = result.isAttend;
            // 원본 error 필드는 삭제
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
