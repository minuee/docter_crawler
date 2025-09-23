const { chromium } = require('playwright');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').trim() : '';
};

// 학력/경력 분류 함수
const parseHistory = (lines) => {
    const education = [];
    const experience = [];
    const eduKeywords = ['졸업', '석사', '박사', '수료'];

    lines.forEach(line => {
        const cleanedLine = cleanText(line);
        if (cleanedLine) {
            if (eduKeywords.some(keyword => cleanedLine.includes(keyword))) {
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
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 논문: [], 언론: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        if ((await page.textContent('body')).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = await page.locator('.basic-info .picture img').getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        synthesizedData.specialty = await page.locator('dl.class dd').last().innerText().then(cleanText);

        const tabs = page.locator('.spec-info .tab .list li a');
        const panels = page.locator('.spec-info .tab-contents .panel');

        for (let i = 0; i < await tabs.count(); i++) {
            await tabs.nth(i).click();
            await page.waitForTimeout(200); // Wait for content to load
            const tabTitle = await tabs.nth(i).innerText();
            const panelContent = await panels.nth(i).locator('ul.list').innerText();
            const lines = panelContent.split('\n');

            if (tabTitle.includes('학력 및 경력')) {
                const { education, experience } = parseHistory(lines);
                synthesizedData.학력.push(...education);
                synthesizedData.경력.push(...experience);
            } else if (tabTitle.includes('학회 및 연수')) {
                lines.forEach(line => {
                    if(line.includes('연수')) synthesizedData.경력.push({ date: null, content: cleanText(line) });
                    else synthesizedData.학술.push({ date: null, content: cleanText(line) });
                });
            } else if (tabTitle.includes('논문')) {
                lines.forEach(line => synthesizedData.논문.push(cleanText(line)));
            } else if (tabTitle.includes('신문 및 방송')) {
                lines.forEach(line => synthesizedData.언론.push({ targetDate: null, type: '기사', text: cleanText(line), url: null, issuer: null }));
            }
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
