const { chromium } = require('playwright');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').trim() : '';
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

        // 재직 여부 확인
        if ((await page.textContent('body')).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 프로필 이미지 추출
        const bgImageStyle = await page.locator('.cont_bg').getAttribute('style');
        const imageUrlMatch = bgImageStyle.match(/url\(([^)]+)\)/);
        if (imageUrlMatch && imageUrlMatch[1]) {
            // 따옴표 제거 및 URL 조합
            const rawUrl = imageUrlMatch[1].replace(/['"]/g, '');
            synthesizedData.profileUrl = new URL(rawUrl, page.url()).href;
        }

        // 진료분야 추출
        synthesizedData.specialty = await page.locator("dt:has-text('진료분야') + dd p").innerText().then(cleanText);

        // 학력, 경력, 학회활동 추출을 위한 헬퍼 함수
        const parseSection = async (title) => {
            const sectionLocator = page.locator(`div.cont_main_profile > div:has(> strong:text-is('${title}'))`);
            if (await sectionLocator.count() > 0) {
                return sectionLocator.locator('ul li dd').evaluateAll(nodes => 
                    nodes.map(n => ({ date: null, content: n.textContent.trim() }))
                );
            }
            return [];
        };

        synthesizedData.학력 = await parseSection('학력');
        synthesizedData.경력 = await parseSection('경력');
        synthesizedData.학술 = await parseSection('학회활동');

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false; // 에러 발생 시 재직 상태를 false로 설정
    } finally {
        if (browser) { await browser.close(); }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    // 빈 배열은 최종 결과에서 제외
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
            // 기존의 불완전한 필드들 삭제
            delete updatedDoctorData.education;
            delete updatedDoctorData.experience;
            delete updatedDoctorData.thesis;
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
