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
    const eduKeywords = ['학사', '석사', '박사', '수련의', '전공의', '전임의'];

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
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 논문: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        const doctorContainer = page.locator(`.prd_list:has-text("${doctorData.bedoc_doctorname}")`);
        if (await doctorContainer.count() === 0) {
            throw new Error(`Doctor ${doctorData.bedoc_doctorname} not found on the page.`);
        }
        isAttend = true;

        const bgImageStyle = await doctorContainer.locator('.img').getAttribute('style');
        const imageUrlMatch = bgImageStyle ? bgImageStyle.match(/url\('([^\)]+)'\)/) : null;
        if (imageUrlMatch && imageUrlMatch[1]) {
            synthesizedData.profileUrl = new URL(imageUrlMatch[1], page.url()).href;
        }

        synthesizedData.specialty = await doctorContainer.locator('h4.tit').innerText().then(cleanText);

        const historyText = await doctorContainer.locator('div.doctor_profile:has(h5:text-is("학력 및 경력")) ul').innerText();
        const { education, experience } = parseHistory(historyText.split('\n'));
        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;

        synthesizedData.학술 = await doctorContainer.locator('div.doctor_profile:has(h5:text-is("학회활동")) ul li').evaluateAll(nodes => nodes.map(n => ({ date: null, content: n.textContent.trim() })));

        const paperButton = doctorContainer.locator('a:has-text("논문보기")');
        if (await paperButton.count() > 0) {
            const onclickAttr = await paperButton.getAttribute('onclick');
            const popupIdMatch = onclickAttr.match(/show\((\d+)\)/);
            if (popupIdMatch && popupIdMatch[1]) {
                const popupId = popupIdMatch[1];
                await paperButton.click();
                const popupSelector = `#pop${popupId}`;
                await page.waitForSelector(popupSelector, { state: 'visible', timeout: 5000 });
                
                // Corrected selector based on user-provided HTML
                const papers = await page.locator(`${popupSelector} .profile_in ul p`).evaluateAll(nodes => 
                    nodes.map(n => n.textContent.trim())
                );
                synthesizedData.논문 = papers.filter(p => p);
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