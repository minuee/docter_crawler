const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], 언론: [], 수상: [], 학술: [] };
    let error = null;
    let isAttend = false;
    let targetPage = page; // 상세 정보가 있는 페이지

    try {
        console.log(`Navigating to: ${doctorData.hospital_site}`);
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // HTML 콘텐츠 가져오기
        const htmlContent = await page.content();
        const $ = cheerio.load(htmlContent);

        // JSON 데이터 추출 로직 (web_fetch가 반환했던 JSON을 HTML에서 찾는 방식)
        // 제일안과병원 웹사이트의 HTML 구조를 분석하여 JSON 데이터가 어디에 있는지 찾아야 합니다.
        // 임시로 <script> 태그 내에 JSON이 있다고 가정하고 정규식을 사용합니다.
        let doctorsList = [];
        const scriptContent = $('script').text();
        const jsonMatch = scriptContent.match(/var doctors = (\s*\[[\s\S]*?\]\s*);/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                doctorsList = JSON.parse(jsonMatch[1]);
            } catch (jsonError) {
                console.warn("Could not parse JSON from script tag:", jsonError.message);
            }
        }

        if (doctorsList.length === 0) {
            // 만약 script 태그에서 JSON을 찾지 못했다면, 다른 방식으로 HTML에서 직접 파싱 시도
            // 이 부분은 제일안과병원 웹사이트의 실제 HTML 구조에 따라 구현해야 합니다.
            // 현재는 web_fetch가 JSON을 반환했으므로, script 태그에 있을 가능성이 높다고 가정합니다.
            // 만약 다른 구조라면 이 부분을 수정해야 합니다.
            console.warn("JSON data not found in script tag. Attempting direct HTML parsing (placeholder).");
            // 임시로 빈 배열 유지 또는 다른 파싱 로직 추가
        }

        const targetDoctor = doctorsList.find(doc => cleanText(doc.name) === cleanText(doctorData.bedoc_doctorname));

        if (targetDoctor) {
            isAttend = true;

            // 프로필 이미지 (JSON 데이터에 직접적인 URL이 없으므로 기존 doctorData의 profileUrl 사용)
            if (doctorData.profileUrl) {
                synthesizedData.profileUrl = new URL(doctorData.profileUrl, doctorData.bedoc_hospitalsite).href;
            }
            
            // 진료분야 (specializations)
            if (targetDoctor.specializations && targetDoctor.specializations.length > 0) {
                synthesizedData.specialty = cleanText(targetDoctor.specializations.join(', '));
            }

            // 학력 (education)
            if (targetDoctor.education && targetDoctor.education.length > 0) {
                targetDoctor.education.forEach(item => {
                    if (item) synthesizedData.학력.push({ date: null, content: cleanText(item) });
                });
            }

            // 경력 (career)
            if (targetDoctor.career && targetDoctor.career.length > 0) {
                targetDoctor.career.forEach(item => {
                    if (item) synthesizedData.경력.push({ date: null, content: cleanText(item) });
                });
            }

            // 학술 (memberships를 학술로 매핑)
            if (targetDoctor.memberships && targetDoctor.memberships.length > 0) {
                targetDoctor.memberships.forEach(item => {
                    if (item) synthesizedData.학술.push({ date: null, content: cleanText(item) });
                });
            }

            // 논문, 저서, 언론, 수상은 현재 JSON 데이터에 없으므로 비워둠

        } else {
            throw new Error(`Doctor "${doctorData.bedoc_doctorname}" not found in the extracted JSON data.`);
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false;
    } finally {
        if (browser) {
            await browser.close();
        }
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
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <path_to_doctor_json_file>');
        process.exit(1);
    }
    const doctorFilePath = process.argv[2];

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };

            if (result.error) {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
            } else {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
            }
            updatedDoctorData.isAttend = result.isAttend;
            updatedDoctorData.error = result.error || null;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
