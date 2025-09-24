const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/["`~`]/g, '').trim() : '';
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
        const html = await page.content();
        const $ = cheerio.load(html);

        if ($('body').text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        const doctorDiv = $('h3.sub_tit:contains("김재홍 원장")').closest('.doc_info');

        const profileSrc = doctorDiv.find('.doc_thum img').attr('src');
        if (profileSrc) {
            synthesizedData.profileUrl = new URL(profileSrc, doctorData.hospital_site).href;
        }
        
        const historyDiv = doctorDiv.find('.doc_txt');
        const historyParagraph = historyDiv.find('p').eq(2);
        const historyHtml = historyParagraph.html();

        if (historyHtml) {
            const historyLines = historyHtml.split('<br>').map(line => cleanText($(line).text()));

            const education = [];
            const experience = [];
            const academic = [];

            historyLines.forEach(line => {
                if (!line) return;
                if (line.includes('졸업') || line.includes('연수')) {
                    education.push({ content: line });
                } else if (line.includes('정회원') || line.includes('회원')) {
                    academic.push({ content: line });
                } else {
                    experience.push({ content: line });
                }
            });

            synthesizedData.학력 = education;
            synthesizedData.경력 = experience;
            synthesizedData.학술 = academic;
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
