
const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/\t/g, '').trim() : '';
};

// <br> 태그로 구분된 텍스트를 배열로 변환하는 함수
const listFromBr = ($, selector) => {
    const html = $(selector).html();
    if (!html) return [];
    return html.split('<br>').map(item => cleanText(item)).filter(item => item);
};

// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 논문: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });
        const html = await page.content();
        const $ = cheerio.load(html);

        // 의사 ID 찾기 (예: doc_info5 -> 5)
        const doctorInfoElement = $(`ul[id^="doc_info"]:has(dd:contains('${doctorData.bedoc_doctorname}'))`);
        
        if (doctorInfoElement.length > 0) {
            isAttend = true;
            const doctorId = doctorInfoElement.attr('id').replace('doc_info', '');

            // 기본 정보 추출
            const profileUrlSrc = doctorInfoElement.find('.imgBg img').attr('src');
            if (profileUrlSrc) {
                synthesizedData.profileUrl = new URL(profileUrlSrc, doctorData.hospital_site).href;
            }
            synthesizedData.specialty = cleanText(doctorInfoElement.find("dt:contains('전문질환')").next('dd').text());

            // 상세 정보 추출
            const detailElement = $(`#detail${doctorId}`);
            if (detailElement.length > 0) {
                synthesizedData.학력 = listFromBr($, detailElement.find("dt:has(img[alt='학력'])").next('dd')).map(content => ({ date: null, content }));
                synthesizedData.경력 = listFromBr($, detailElement.find("dt:has(img[alt='경력'])").next('dd')).map(content => ({ date: null, content }));
                synthesizedData.학술 = listFromBr($, detailElement.find("dt:has(img[alt='학회'])").next('dd')).map(content => ({ date: null, content }));
                synthesizedData.논문 = listFromBr($, detailElement.find("dt:has(img[alt='저술정보'])").next('dd'));
            }

        } else {
            isAttend = false;
            error = `Doctor ${doctorData.bedoc_doctorname} not found on the page.`;
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
        if ((Array.isArray(finalResult[key]) && finalResult[key].length === 0) || finalResult[key] === null) {
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
