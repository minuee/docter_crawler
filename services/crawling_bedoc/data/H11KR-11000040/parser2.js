const { chromium } = require('playwright');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/"/g, '').trim() : '';
};

// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        const contentHtml = await page.content();
        const $ = cheerio.load(contentHtml);

        // 재직 여부 확인
        if ($('body').text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 프로필 이미지 추출
        const profileImgSrc = $('.pic img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
        }

        // 전문분야 추출
        synthesizedData.specialty = cleanText($('.denti p').attr('title'));

        // 섹션별 데이터 추출 헬퍼 함수
        const parseSection = (title) => {
            const items = [];
            $(`h4:contains('${title}')`).next('table').find('td p').each((i, el) => {
                const date = cleanText($(el).find('span').first().text());
                const content = cleanText($(el).find('span').last().text());
                if (content) {
                    items.push({ date: date || null, content });
                }
            });
            return items;
        };

        synthesizedData.학력 = parseSection('학력');
        synthesizedData.경력 = parseSection('경력');
        synthesizedData.학술 = parseSection('학회활동');

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
    const doctorDataJson = process.argv[2];
    if (!doctorDataJson) {
        console.error("Please provide the doctor's JSON data as a string argument.");
        process.exit(1);
    }

    const doctorData = JSON.parse(doctorDataJson);

    parseDoctorProfile(doctorData)
        .then(result => {
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(error => {
            console.error(`A critical error occurred:`, error);
            console.log(JSON.stringify({ error: error.message }, null, 2));
        });
}
