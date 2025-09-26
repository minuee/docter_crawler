const { chromium } = require('playwright');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    const { bedoc_doctorname, hospital_site, aiga_hid } = doctorData;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let extractedData = {};

    try {
        console.log(`[Playwright] Navigating to ${hospital_site} for ${bedoc_doctorname}...`);
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 600000 }); // 10분 타임아웃

        const htmlContent = await page.content();
        const $ = cheerio.load(htmlContent);

        // 진료분야 (specialty) 추출 개선
        let specialty = '';
        // 0. .pro-part p.tit-bld:contains("전문과목") 다음 p.conte 탐색 (일산백병원 특화)
        specialty = $('.pro-part p.tit-bld:contains("전문과목")').next('p.conte').text().trim();
        
        // 1. dt-dd 구조 탐색
        if (!specialty) {
            $('dt:contains("진료분야"), dt:contains("전문분야")').each((i, el) => {
                const nextDd = $(el).next('dd');
                if (nextDd.length) {
                    specialty = nextDd.text().trim();
                    return false;
                }
            });
        }
        // 2. table 구조 탐색
        if (!specialty) {
            $('th:contains("진료분야"), th:contains("전문분야")').each((i, el) => {
                const nextTd = $(el).next('td');
                if (nextTd.length) {
                    specialty = nextTd.text().trim();
                    return false;
                }
            });
        }
        // 3. 기존 h3, h4, strong 다음 형제 요소 탐색
        if (!specialty) {
            $('h3:contains("진료분야"), h4:contains("진료분야"), strong:contains("진료분야"), ' +
              'h3:contains("전문분야"), h4:contains("전문분야"), strong:contains("전문분야")')
                .each((i, el) => {
                    const nextElement = $(el).next();
                    if (nextElement.length) {
                        specialty = nextElement.text().trim();
                        return false;
                    }
                });
        }
        // 4. 특정 클래스나 ID를 가진 요소에서 직접 추출 시도 (최후의 수단)
        if (!specialty) {
            specialty = $('.doctor-specialty, #specialty-info, .specialty-area').text().trim();
        }
        extractedData.specialty = specialty.replace(/"/g, ''); // 큰따옴표 제거

        // 학력 (education) 추출 개선
        const educationList = [];
        // NEW: .so-tit.a span:contains("학력사항") 구조 탐색 (최평화 의사 페이지 특화)
        $('div.so-tit.a span:contains("학력사항")').closest('.part').find('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) educationList.push({ content: text.replace(/"/g, '') });
        });

        // 1. dt-dd 구조 탐색
        if (educationList.length === 0) {
            $('dt:contains("학력")').next('dd').find('li, p').each((i, el) => {
                const text = $(el).text().trim();
                if (text) educationList.push({ content: text.replace(/"/g, '') });
            });
        }
        // 2. table 구조 탐색
        if (educationList.length === 0) {
            $('th:contains("학력")').next('td').find('li, p').each((i, el) => {
                const text = $(el).text().trim();
                if (text) educationList.push({ content: text.replace(/"/g, '') });
            });
        }
        // 3. 기존 h3, h4, strong 다음 형제 요소 탐색
        if (educationList.length === 0) {
            $('h3:contains("학력"), h4:contains("학력"), strong:contains("학력")')
                .nextUntil('h3, h4, strong, .section-title, dt, th')
                .find('li, p')
                .each((i, el) => {
                    const text = $(el).text().trim();
                    if (text) educationList.push({ content: text.replace(/"/g, '') });
                });
        }
        extractedData.학력 = educationList;

        // 경력 (experience) 추출 개선
        const experienceList = [];
        // NEW: .so-tit.b span:contains("경력사항") 구조 탐색 (최평화 의사 페이지 특화)
        $('div.so-tit.b span:contains("경력사항")').closest('.part').find('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) experienceList.push({ content: text.replace(/"/g, '') });
        });

        // 1. dt-dd 구조 탐색
        if (experienceList.length === 0) {
            $('dt:contains("경력")').next('dd').find('li, p').each((i, el) => {
                const text = $(el).text().trim();
                if (text) experienceList.push({ content: text.replace(/"/g, '') });
            });
        }
        // 2. table 구조 탐색
        if (experienceList.length === 0) {
            $('th:contains("경력")').next('td').find('li, p').each((i, el) => {
                const text = $(el).text().trim();
                if (text) experienceList.push({ content: text.replace(/"/g, '') });
            });
        }
        // 3. 기존 h3, h4, strong 다음 형제 요소 탐색
        if (experienceList.length === 0) {
            $('h3:contains("경력"), h4:contains("경력"), strong:contains("경력")')
                .nextUntil('h3, h4, strong, .section-title, dt, th')
                .find('li, p')
                .each((i, el) => {
                    const text = $(el).text().trim();
                    if (text) experienceList.push({ content: text.replace(/"/g, '') });
                });
        }
        extractedData.경력 = experienceList;

        // 주요활동 (학술) 추출
        const academicList = [];
        $('div.part div.so-tit.c:contains("주요활동")').nextAll('p').each((i, el) => {
            const text = $(el).html().split('<br>').map(t => cheerio.load(t).text().trim()).filter(t => t);
            text.forEach(t => academicList.push({ content: t.replace(/"/g, '') }));
        });
        extractedData.학술 = academicList;

        // 논문/저서 추출 (tab-2)
        const thesisList = [];
        const booksList = [];
        $('#tab-2 div.so-tit.d:contains("논문/저서")').nextAll('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                if (text.includes('논문 :')) {
                    thesisList.push(text.replace('논문 :', '').trim().replace(/"/g, ''));
                } else if (text.includes('저서 :')) {
                    booksList.push({ content: text.replace('저서 :', '').trim().replace(/"/g, '') });
                } else {
                    thesisList.push(text.replace(/"/g, ''));
                }
            }
        });
        extractedData.논문 = thesisList;
        extractedData.저서 = booksList;

        // 언론보도 추출 (tab-3)
        const mediaList = [];
        $('#tab-3 .news-box').each((i, el) => {
            const title = $(el).find('.new-tit').text().trim();
            const date = $(el).find('.dates').text().trim();
            const issuer = $(el).find('.tv_label').text().trim();
            const url = $(el).find('a').attr('href');
            if (title) {
                mediaList.push({
                    targetDate: date || null,
                    type: '기사', // 또는 '유튜브' 등
                    text: cleanText(title),
                    url: url || null,
                    issuer: issuer || null
                });
            }
        });
        extractedData.언론 = mediaList;

        // isAttend 확인 (의사 이름이 페이지에 있는지)
        const isAttend = htmlContent.includes(bedoc_doctorname);

        extractedData = {
            ...doctorData,
            ...extractedData, // 추출된 데이터 병합
            isSearchType: 'html_playwright',
            isExist: true,
            isAttend: isAttend,
            error: null,
        };

    } catch (error) {
        console.error(`[Playwright] Error for ${bedoc_doctorname} (${aiga_hid}): ${error.message}`);
        extractedData = {
            ...doctorData,
            isSearchType: 'html_playwright_failed',
            isExist: false,
            error: error.message,
        };
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }
    return extractedData;
}

// 명령줄 인자 파싱
const args = process.argv.slice(2);
const doctorData = JSON.parse(args[0]);

parseDoctorProfile(doctorData)
    .then(result => {
        console.log(JSON.stringify(result));
    })
    .catch(error => {
        console.error(JSON.stringify({ error: error.message }));
    });