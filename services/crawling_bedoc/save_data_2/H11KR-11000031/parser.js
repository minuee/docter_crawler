const { chromium } = require('playwright');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/"/g, '').trim() : '';
};

// 약력 파싱 함수
const parseProfileHistory = (htmlContent) => {
    const lines = htmlContent.split('\n').map(line => line.trim()).filter(line => line);
    const education = [];
    const experience = [];

    lines.forEach(line => {
        const cleanedLine = cleanText(line.replace(/<br>/g, ''));
        if (cleanedLine) {
            if (cleanedLine.includes('졸업') || cleanedLine.includes('의대')) {
                education.push({ date: null, content: cleanedLine });
            } else {
                experience.push({ date: null, content: cleanedLine });
            }
        }
    });

    return { education, experience };
};


// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 언론: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        // 해당 의사 이름이 포함된 컨테이너 찾기
        const doctorContainer = page.locator(`.reservation01-conternt:has-text('${doctorData.bedoc_doctorname}')`);
        if (await doctorContainer.count() === 0) {
            throw new Error(`Doctor ${doctorData.bedoc_doctorname} not found on the page.`);
        }
        isAttend = true;

        // 프로필 이미지 추출
        synthesizedData.profileUrl = await doctorContainer.locator('img[src*="/UPLOAD/DT/"]').first().getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);

        // 전공분야 추출
        const specialtyText = await doctorContainer.locator('p:has-text("전공분야") span').innerText();
        synthesizedData.specialty = cleanText(specialtyText);

        // 약력(학력/경력) 추출
        const historyHtml = await doctorContainer.locator('.conbox-type-01 .left.ml_70').innerHTML();
        const { education, experience } = parseProfileHistory(historyHtml);
        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;

        // 언론(기사) 추출
        const articles = await doctorContainer.locator('.docinfo_news li a').evaluateAll(nodes => nodes.map(n => ({
            targetDate: null,
            type: '기사',
            text: n.textContent.trim(),
            url: n.href,
            issuer: null
        })));
        synthesizedData.언론.push(...articles);

        // 언론(영상) 추출
        const videos = await doctorContainer.locator('.docinfo_clip li a').evaluateAll(nodes => nodes.map(n => ({
            targetDate: null,
            type: '유튜브',
            text: n.querySelector('span')?.textContent.trim() || '영상',
            url: n.href,
            issuer: '유튜브'
        })));
        synthesizedData.언론.push(...videos);


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
