const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/[\n\t]/g, ' ').trim() : '';
};

// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 논문: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        const doctorLinkSelector = `a:has-text("${doctorData.bedoc_doctorname}")`;
        const doctorLink = page.locator(doctorLinkSelector);

        if (await doctorLink.count() > 0) {
            isAttend = true;
            const onclickAttr = await doctorLink.getAttribute('href');
            const match = onclickAttr.match(/openStaffIntro\('(\d+)'\)/);

            if (match && match[1]) {
                const staffNo = match[1];
                
                const detailHtml = await page.evaluate(async ({ staffNo }) => {
                    const response = await fetch('http://healthyfriend.co.kr/introduce/get_staff_intro_html', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                        },
                        body: `staff_no=${staffNo}`
                    });
                    return await response.text();
                }, { staffNo });

                const $ = cheerio.load(detailHtml);

                const profileUrlSrc = $('.section1_l img').attr('src');
                if(profileUrlSrc) {
                    synthesizedData.profileUrl = new URL(profileUrlSrc, doctorData.hospital_site).href;
                }
                synthesizedData.specialty = cleanText($('.lay_subject li').text());

                $('.section2 .lay_career ul li').each((i, el) => {
                    const content = cleanText($(el).find('span').last().text());
                    if (content) {
                        if (content.includes('의학박사')) {
                            synthesizedData.학력.push({ date: null, content });
                        } else {
                            synthesizedData.경력.push({ date: null, content });
                        }
                    }
                });

                $('.section3 .lay_thesis ul li').each((i, el) => {
                    const content = cleanText($(el).find('span').text());
                    if (content) {
                        synthesizedData.논문.push(content);
                    }
                });

            } else {
                throw new Error('Could not parse doctor ID from href attribute.');
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