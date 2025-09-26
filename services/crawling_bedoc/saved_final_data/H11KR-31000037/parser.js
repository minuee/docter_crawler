const { chromium } = require('playwright');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').trim() : '';
};

// 경력/학술 분류 함수
const parseCareerAndSocieties = (lines) => {
    const experience = [];
    const societies = [];
    const societyKeywords = ['회원', '학회', '의사협회'];

    lines.forEach(line => {
        const cleanedLine = cleanText(line);
        if (cleanedLine) {
            if (societyKeywords.some(keyword => cleanedLine.includes(keyword))) {
                societies.push({ date: null, content: cleanedLine });
            } else {
                experience.push({ date: null, content: cleanedLine });
            }
        }
    });

    return { experience, societies };
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
        synthesizedData.profileUrl = await page.locator('.doctor-img img').getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);

        // 진료분야 추출
        synthesizedData.specialty = await page.locator('.field .cont').innerText().then(cleanText);

        // 학력 추출
        const educationText = await page.locator('.edu .cont-wrap').innerText();
        synthesizedData.학력 = educationText.split('\n').map(line => ({ date: null, content: cleanText(line) })).filter(item => item.content);

        // 경력 및 학술활동 추출
        const careerText = await page.locator('.career .cont-wrap').innerText();
        const { experience, societies } = parseCareerAndSocieties(careerText.split('\n'));
        synthesizedData.경력 = experience;
        synthesizedData.학술 = societies;

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
