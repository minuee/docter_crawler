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
    const eduKeywords = ['석사', '박사', '학사'];

    items.forEach(item => {
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
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        if ((await page.textContent('body')).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = await page.locator('.swiper-slide-active img').getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        synthesizedData.specialty = await page.locator('.speci p').nth(1).innerText().then(cleanText);

        const parseSection = async (title) => {
            const sectionLocator = page.locator(`div.prd_list:has(h4.tit:text-is('${title}'))`);
            if (await sectionLocator.count() > 0) {
                return sectionLocator.locator('.history dl').evaluateAll(nodes => 
                    nodes.map(n => ({
                        date: n.querySelector('dt')?.textContent.trim() || null,
                        content: n.querySelector('dd li')?.textContent.trim() || ''
                    }))
                );
            }
            return [];
        };

        const historyItems = await parseSection('학력/경력');
        const { education, experience } = parseHistory(historyItems);
        synthesizedData.학력 = education;
        synthesizedData.경력 = experience;

        synthesizedData.학술 = await parseSection('학회활동');
        synthesizedData.수상 = await parseSection('수상');

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