const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], 언론: [], 수상: [], 학술: [] };
    let error = null;
    let isAttend = false;

    try {
        console.log(`Navigating to: ${doctorData.hospital_site}`);
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // 재직 여부 확인 (의사 이름이 페이지에 있는지)
        if ((await page.content()).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // --- 데이터 추출 ---
        // 프로필 이미지
        const profileImgSrc = await page.$eval('.doctor_info .img_area img', img => img.src).catch(() => null);
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
        }
        
        // 진료분야 (전문분야)
        synthesizedData.specialty = cleanText(await page.$eval('dl.special dd', dd => dd.textContent).catch(() => ''));

        // 학력, 경력, 학회, 수상 (career_list 내 career_box)
        const careerListContent = await page.evaluate(() => {
            const data = {};
            document.querySelectorAll('.career_list .career_box').forEach(box => {
                const title = box.querySelector('h4').textContent.trim();
                const items = [];
                box.querySelectorAll('li').forEach(li => items.push(li.textContent.trim()));
                data[title] = items;
            });
            return data;
        });

        if (careerListContent['교수 경력']) {
            careerListContent['교수 경력'].forEach(item => synthesizedData.학력.push({ date: null, content: cleanText(item) }));
        }
        if (careerListContent['진료 경력']) {
            careerListContent['진료 경력'].forEach(item => synthesizedData.경력.push({ date: null, content: cleanText(item) }));
        }

        // 학회/연구/Postdoctorial Fellowship/수상경력 (복합 섹션 처리)
        const mixedSectionItems = await page.$$eval('div#ctl00_ContentPlaceHolder1_p2 ul.dot_list li', elements => {
            return elements.map(el => ({ text: el.textContent.trim(), isPart: el.classList.contains('part') }));
        });

        let currentCategory = null;
        mixedSectionItems.forEach(item => {
            if (item.isPart) {
                currentCategory = item.text;
            } else if (item.text) {
                if (currentCategory === '학회') {
                    synthesizedData.학술.push({ date: null, content: cleanText(item.text) });
                } else if (currentCategory === '수상') {
                    synthesizedData.수상.push({ date: null, content: cleanText(item.text) });
                }
                // '연구'나 'Postdoctorial Fellowship'은 현재 웹페이지에서 명확히 구분되지 않으므로, 필요시 추가 로직 구현
            }
        });

        // 논문 (동적 로딩 처리)
        await page.click('ul.news_tab li[rel="paper"]'); // 논문 탭 클릭
        await page.waitForTimeout(500); // 탭 전환 대기

        // '더보기' 버튼 반복 클릭
        let thesisMoreButtonVisible = true;
        while (thesisMoreButtonVisible) {
            thesisMoreButtonVisible = await page.$('.thesisBtn[style*="display: block"]') !== null; // '더보기' 버튼이 보이는지 확인
            if (thesisMoreButtonVisible) {
                await page.click('.thesisBtn');
                await page.waitForTimeout(500); // 내용 로드 대기
            } else {
                thesisMoreButtonVisible = await page.$('.thesisBtn') !== null && await page.$eval('.thesisBtn', btn => btn.style.display !== 'none');
                if (thesisMoreButtonVisible) {
                    await page.click('.thesisBtn');
                    await page.waitForTimeout(500); // 내용 로드 대기
                } else {
                    break;
                }
            }
        }

        const paperContent = await page.content();
        const $paper = cheerio.load(paperContent);
        $paper('ol.thesisList li').each((i, el) => {
            const paperText = cleanText($paper(el).text().replace(/\d+/g, '').trim()); // 번호 제거
            if (paperText) {
                synthesizedData.논문.push(paperText);
            }
        });

        // 언론 (동적 로딩 처리)
        await page.click('ul.news_tab li[rel="article"]'); // 언론 탭 클릭
        await page.waitForTimeout(500); // 탭 전환 대기

        // '더보기' 버튼 반복 클릭
        let articleMoreButtonVisible = true;
        while (articleMoreButtonVisible) {
            articleMoreButtonVisible = await page.$('.boardBtn[style*="display: block"]') !== null; // '더보기' 버튼이 보이는지 확인
            if (articleMoreButtonVisible) {
                await page.click('.boardBtn');
                await page.waitForTimeout(500); // 내용 로드 대기
            } else {
                articleMoreButtonVisible = await page.$('.boardBtn') !== null && await page.$eval('.boardBtn', btn => btn.style.display !== 'none');
                if (articleMoreButtonVisible) {
                    await page.click('.boardBtn');
                    await page.waitForTimeout(500); // 내용 로드 대기
                } else {
                    break;
                }
            }
        }

        const articleContent = await page.content();
        const $article = cheerio.load(articleContent);
        $article('ul#tiles li').each((i, el) => {
            const mediaText = cleanText($article(el).text());
            if (mediaText) {
                synthesizedData.언론.push({ targetDate: null, type: '기사', text: mediaText, url: null, issuer: null });
            }
        });

        // 저서 (웹페이지에 명확한 섹션 없음, 비워둠)

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
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <path_to_doctor_json_file>');
        process.exit(1);
    }
    const doctorFilePath = process.argv[2];

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
