
const { chromium } = require('playwright');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').trim() : '';
};

// 학력/경력 분류 함수
const parseHistory = (items) => {
    const education = [];
    const experience = [];
    const eduKeywords = ['대학', '박사', '학사', '석사'];

    items.forEach(itemText => {
        const item = { date: null, content: itemText };
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
    const synthesizedData = { 학력: [], 경력: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        // 페이지에 의사 이름이 있는지 확인하여 재직 여부 판단
        if ((await page.locator(`h4:text-is("${doctorData.bedoc_doctorname}")`).count()) > 0) {
            isAttend = true;
        }

        // 팝업이 페이지에 이미 로드되어 있으므로 직접 파싱
        const popupSelector = '#popup0';

        // 프로필 이미지 URL 추출
        synthesizedData.profileUrl = await page.locator(`${popupSelector} .dr-image img`).getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        
        // 진료 분야 추출
        synthesizedData.specialty = await page.locator(`${popupSelector} .category`).innerText().then(cleanText);

        // 학력 및 경력 추출
        const historyItems = await page.locator(`${popupSelector} .history p`).evaluateAll(nodes => 
            nodes.map(n => n.textContent.trim())
        );
        
        const { education, experience } = parseHistory(historyItems);
        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false; // 에러 발생 시 재직 여부 불확실
    } finally {
        if (browser) { await browser.close(); }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    // 빈 배열은 결과에서 제외
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
            delete updatedDoctorData.error; // 에러 메시지 필드는 최종 결과에서 삭제

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated successfully: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`A critical error occurred for ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
