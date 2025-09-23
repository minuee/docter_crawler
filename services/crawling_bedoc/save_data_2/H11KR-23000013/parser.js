const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/\n/g, ' ').trim() : '';
};

// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        // 1. 목록 페이지로 이동하여 의사 ID 추출
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });
        
        const doctorLinkSelector = `a:has-text("${doctorData.bedoc_doctorname}")`;
        const doctorLink = page.locator(doctorLinkSelector);

        if (await doctorLink.count() > 0) {
            isAttend = true;
            const onclickAttr = await doctorLink.getAttribute('onclick');
            // 더 간단하고 안정적인 방법으로 ID 추출
            const match = onclickAttr.match(/career_open_doctor\((.*)\)/);

            if (match && match[1]) {
                const args = match[1].split(',');
                const doctorId = args[args.length - 1].replace(/'/g, '').trim();

                const ajaxUrl = `http://www.gooh.co.kr/Module/ReserveOnline/Ajax_DoctorProfile_sub01.asp?IDX=${doctorId}`;

                // 2. AJAX URL로 직접 이동하여 상세 정보 HTML 로드
                await page.goto(ajaxUrl, { waitUntil: 'networkidle' });
                const detailHtml = await page.content();
                const $ = cheerio.load(detailHtml);

                // 3. 상세 정보 파싱
                synthesizedData.profileUrl = $('.photo img').attr('src') ? new URL($('.photo img').attr('src'), 'http://www.gooh.co.kr').href : null;
                synthesizedData.specialty = cleanText($('h5:contains("전문분야") + div').text());

                const historyText = $('h5:contains("약력 및 이력") + div').html();
                if (historyText) {
                    const lines = historyText.split('<br>').map(line => cleanText(line)).filter(line => line);
                    
                    let currentSection = '경력'; // Default section
                    lines.forEach(line => {
                        if (line.includes('◎ 이력')) {
                            currentSection = '경력';
                            return;
                        } else if (line.includes('◎ 학회활동')) {
                            currentSection = '학술';
                            return;
                        }

                        const eduKeywords = ['학사', '석사', '박사', '수료'];
                        const isEducation = eduKeywords.some(kw => line.includes(kw));

                        if (isEducation) {
                            synthesizedData.학력.push({ date: null, content: line });
                        } else if (currentSection === '학술') {
                            synthesizedData.학술.push({ date: null, content: line });
                        } else {
                            synthesizedData.경력.push({ date: null, content: line });
                        }
                    });
                }

            } else {
                throw new Error('Could not parse doctor ID from onclick attribute.');
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
module.exports = { parseDoctorProfile };

