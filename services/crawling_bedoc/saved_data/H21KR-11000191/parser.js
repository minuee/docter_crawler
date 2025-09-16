const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], 언론: [], 수상: [], 학술: [] };
    let error = null;
    let isAttend = false;

    try {
        console.log(`Navigating to: ${doctorData.hospital_site}`);
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const content = await page.content(); // 원본 HTML 내용 가져오기
        const $ = cheerio.load(content);

        // 재직 여부 확인 (의사 이름이 페이지에 있는지)
        if ($('body').text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // --- 데이터 추출 ---
        // 프로필 이미지 (background-image에서 추출)
        const profileSectionStyle = $('section.doc-info.detail-01[style*="background-image"]').attr('style');
        if (profileSectionStyle) {
            const match = profileSectionStyle.match(/url\(['"]?(.*?)["']?\)/);
            if (match && match[1]) {
                synthesizedData.profileUrl = new URL(match[1], doctorData.hospital_site).href;
            }
        }
        
        // 전문분야
        synthesizedData.specialty = cleanText($('div.name span').text());

        // 약력 (학력, 경력, 학회활동 등 복합)
        const resumeText = cleanText($('section.doc-history.detail-01 div.history-wrap p').html());
        if (resumeText) {
            const lines = resumeText.split(/<br\s*\/?>/);
            lines.forEach(line => {
                const cleanedLine = cleanText(line);
                if (cleanedLine) {
                    if (cleanedLine.includes('대학교') || cleanedLine.includes('의학박사') || cleanedLine.includes('수련') || cleanedLine.includes('전임의') || cleanedLine.includes('연수') || cleanedLine.includes('졸업')) {
                        synthesizedData.학력.push({ date: null, content: cleanedLine });
                    } else if (cleanedLine.includes('現') || cleanedLine.includes('前') || cleanedLine.includes('역임') || cleanedLine.includes('병원장') || cleanedLine.includes('원장') || cleanedLine.includes('부원장') || cleanedLine.includes('과장')) {
                        synthesizedData.경력.push({ date: null, content: cleanedLine });
                    } else if (cleanedLine.includes('학회') || cleanedLine.includes('회원') || cleanedLine.includes('회장') || cleanedLine.includes('이사')) {
                        synthesizedData.학술.push({ date: null, content: cleanedLine });
                    } else {
                        // 분류되지 않은 약력은 경력으로 임시 분류
                        synthesizedData.경력.push({ date: null, content: cleanedLine });
                    }
                }
            });
        }

        // 수상
        $('div.profile-wrap:has(h2:contains("수상")) div.profile-list.date').each((i, el) => {
            const date = cleanText($(el).find('.year').text());
            const content = cleanText($(el).find('.text p').text());
            if (content) {
                synthesizedData.수상.push({ date: date || null, content: content });
            }
        });

        // 저서
        $('div.profile-wrap:has(h2:contains("저서")) div.profile-list.book').each((i, el) => {
            const content = cleanText($(el).find('.text p').text());
            if (content) {
                synthesizedData.저서.push({ date: null, content: content });
            }
        });

        // 학회 및 강의
        $('div.profile-wrap:has(h2:contains("학회 및 강의")) div.profile-list.date').each((i, el) => {
            const year = cleanText($(el).find('.year').text());
            $(el).find('.text p').each((j, pEl) => {
                const content = cleanText($(pEl).text());
                if (content) {
                    synthesizedData.학술.push({ date: year || null, content: content });
                }
            });
        });

        // 학회 연제 발표
        $('div.profile-wrap:has(h2:contains("학회 연제 발표")) div.profile-list.date').each((i, el) => {
            const year = cleanText($(el).find('.year').text());
            $(el).find('.text p').each((j, pEl) => {
                const content = cleanText($(pEl).text());
                if (content) {
                    synthesizedData.학술.push({ date: year || null, content: content });
                }
            });
        });

        // 논문
        $('div.profile-wrap:has(h2:contains("논문")) div.profile-list.book2').each((i, el) => {
            const content = cleanText($(el).find('.text p').text());
            if (content) {
                synthesizedData.논문.push(content);
            }
        });

        // 언론 (웹페이지에 명확한 섹션 없음, 비워둠)

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false;
    } finally {
        if (browser) {
            await browser.close();
        }
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
        console.error('Usage: node parser.js <path_to_doctor_json_file>');
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };

            if (result.error) {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
            } else {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
            }
            updatedDoctorData.isAttend = result.isAttend;
            updatedDoctorData.error = result.error || null;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
