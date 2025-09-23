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

    let extractedData = { 학력: [], 경력: [], 논문: [], 저서: [], 언론: [], 수상: [], 학술: [] };
    let isAttend = false;

    try {
        console.log(`Navigating to list page: ${doctorData.hospital_site}`);
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const content = await page.content(); // 페이지의 전체 HTML 내용 가져오기
        const $ = cheerio.load(content);

        // 의사 이름으로 li 요소를 찾음 (cheerio 호환 방식으로 수정)
        let doctorListItem = null;
        $('li').each((i, liElement) => {
            const $liElement = $(liElement);
            const nameElement = $liElement.find('li.name');
            if (nameElement.length > 0 && nameElement.text().includes(doctorData.bedoc_doctorname)) {
                // 이름이 일치하는 li를 찾음
                // 추가 필터링 (진료과) 필요 시 여기에 로직 추가
                doctorListItem = $liElement;
                return false; // each 루프 중단
            }
        });

        if (!doctorListItem) {
            throw new Error(`Doctor ${doctorData.bedoc_doctorname} not found on the list page.`);
        }

        const dataMdSeq = doctorListItem.find('li.drbt div.drbt1.link_detail').attr('data-md_seq');
        if (!dataMdSeq) {
            throw new Error(`data-md_seq not found for ${doctorData.bedoc_doctorname}.`);
        }

        // 상세 정보 div를 직접 접근 (항상 HTML에 존재한다고 가정)
        const doctorDetailSelector = `div.drviewwrap#drviewwrap${dataMdSeq}`;
        const detailView = $(doctorDetailSelector);

        if (detailView.length === 0) {
            throw new Error(`Doctor detail view ${doctorDetailSelector} not found in HTML.`);
        }

        // --- 데이터 추출 시작 ---
        // 재직 여부 확인 (상세 정보 div가 HTML에 존재하면 재직 중으로 간주)
        isAttend = true;

        // 프로필 이미지
        const profileImgSrc = detailView.find('li.drviewimg img').attr('src');
        if (profileImgSrc) {
            extractedData.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
        }
        
        // 전문분야
        extractedData.specialty = cleanText(detailView.find('div.content').filter((i, el) => $(el).find('p').text().includes("진료분야")).find('ul li').text());

        // 경력 (정확한 셀렉터 사용)
        detailView.find('div.content').filter((i, el) => $(el).find('p').text().includes("경력")).find('ul li').each((i, el) => {
            extractedData.경력.push({ date: null, content: cleanText($(el).text()) });
        });

        // 수상 (정확한 셀렉터 사용)
        detailView.find('div.content').filter((i, el) => $(el).find('p').text().includes("수상경력")).find('ul li').each((i, el) => {
            extractedData.수상.push({ date: null, content: cleanText($(el).text()) });
        });

        // 학회활동 (정확한 셀렉터 사용)
        detailView.find('div.content').filter((i, el) => $(el).find('p').text().includes("학회활동")).find('ul li').each((i, el) => {
            extractedData.학술.push({ date: null, content: cleanText($(el).text()) });
        });

        // 자격사항 (학력으로 분류, 정확한 셀렉터 사용)
        detailView.find('div.content').filter((i, el) => $(el).find('p').text().includes("자격사항")).find('ul li').each((i, el) => {
            extractedData.학력.push({ date: null, content: cleanText($(el).text()) });
        });

        // 논문, 저서, 기사, 방송 출연 (복합 섹션) - 모든 내용을 논문에만 저장
        detailView.find('div.content').filter((i, el) => $(el).find('p').text().includes("논문, 저서, 기사, 방송 출연")).find('ul li').each((i, el) => {
            const itemText = cleanText($(el).text());
            extractedData.논문.push(itemText); // 모든 내용을 논문에만 저장
        });

        // 저서와 언론 필드는 비워둠
        extractedData.저서 = [];
        extractedData.언론 = [];

    } catch (error) {
        console.error(`Error during Playwright parsing for ${doctorData.bedoc_doctorname} at ${doctorData.hospital_site}:`, error);
        extractedData = { error: error.message };
        isAttend = false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    const finalResult = { ...extractedData, isAttend };
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
            }
            // isExist는 데이터가 추출되었을 때만 true로 설정
            else if (Object.keys(result).some(key => Array.isArray(result[key]) && result[key].length > 0) || result.profileUrl || result.specialty) {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
            } else {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
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
