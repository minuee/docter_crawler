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
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 논문: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        // Changed from 'networkidle' to 'domcontentloaded'
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded' });
        
        // Added a small wait just in case, selector waits should handle the rest.
        await page.waitForTimeout(2000);

        // 재직 여부 확인
        if ((await page.textContent('body')).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 프로필 이미지 추출
        const bgImageStyle = await page.locator('.section1 .wsize:not(.swiper-fade)').getAttribute('style');
        const imageUrlMatch = bgImageStyle ? bgImageStyle.match(/url\('([^']+)'\)/) : null;
        if (imageUrlMatch && imageUrlMatch[1]) {
            synthesizedData.profileUrl = new URL(imageUrlMatch[1], page.url()).href;
        }

        // 전문진료분야 추출
        synthesizedData.specialty = await page.locator('p.clinic > span').innerText().then(cleanText);

        // 학력 및 경력 추출 (기본 활성화 탭)
        const eduHistorySection = page.locator('#doctor_cont1');
        synthesizedData.학력 = await eduHistorySection.locator("dl:has(dt:text-is('학력')) li").evaluateAll(nodes => nodes.map(n => ({ date: null, content: n.textContent.trim() })));
        synthesizedData.경력 = await eduHistorySection.locator("dl:has(dt:text-is('경력')) li").evaluateAll(nodes => nodes.map(n => ({ date: null, content: n.textContent.trim() })));

        // 학회활동 추출
        await page.click('#doctor_contab2');
        await page.waitForSelector('#doctor_cont2:not([style*="display:none"])', { timeout: 5000 });
        synthesizedData.학술 = await page.locator('#doctor_cont2 li').evaluateAll(nodes => nodes.map(n => ({ date: null, content: n.textContent.trim() })));

        // 논문 추출
        await page.click('#doctor_contab3');
        await page.waitForSelector('#doctor_cont3:not([style*="display:none"])', { timeout: 5000 });
        synthesizedData.논문 = await page.locator('#doctor_cont3 li').evaluateAll(nodes => nodes.map(n => n.textContent.trim()));

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