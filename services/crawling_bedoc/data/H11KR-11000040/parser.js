const { chromium } = require('playwright');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/"/g, "'").trim() : '';
};

// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 언론: [], 논문: [], 저서: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        const contentHtml = await page.content();
        const $ = cheerio.load(contentHtml);

        // 재직 여부 확인
        if ($('body').text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 프로필 이미지 추출
        const profileImgSrc = $('.pic img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
        }

        // 전문분야 추출
        synthesizedData.specialty = cleanText($('.denti p').attr('title'));

        // Helper to parse sections in the first tab
        const parseInfoSection = (title) => {
            const items = [];
            $(`h4:contains('${title}')`).next('table').find('td p').each((i, el) => {
                const date = cleanText($(el).find('span').first().text());
                const content = cleanText($(el).find('span').last().text());
                if (content) {
                    items.push({ date: date || null, content });
                }
            });
            return items;
        };

        synthesizedData.학력 = parseInfoSection('학력');
        synthesizedData.경력 = parseInfoSection('경력');
        synthesizedData.학술 = parseInfoSection('학회활동');

        // Parse '논문/저서' from the second tab
        const publicationsNode = $('#tab_con02 .thesis_list');
        publicationsNode.find('br').replaceWith('\n');
        const publicationsText = publicationsNode.text();
        const lines = publicationsText.split('\n').map(line => line.trim()).filter(Boolean);
        
        let currentCategory = '논문'; // Default category

        lines.forEach(line => {
            if (line.includes('◎ 저서/저술')) {
                currentCategory = '저서';
                return; // Skip the header line
            } else if (line.includes('◎')) {
                currentCategory = '논문'; // Reset to paper if another category starts
                return; // Skip header line
            }

            if (currentCategory === '저서') {
                synthesizedData.저서.push({ content: cleanText(line) });
            } else {
                synthesizedData.논문.push(cleanText(line));
            }
        });

        // Click the '언론보도' tab and wait for its content
        const mediaResponsePromise = page.waitForResponse(res => res.url().includes('ajax_board.asp'));
        await page.click('a[href="#tab_con03"]');
        const mediaResponse = await mediaResponsePromise;
        const mediaHtml = await mediaResponse.text();
        const $$ = cheerio.load(mediaHtml);

        $$('ul.clr li').each((i, el) => {
            const issuer = cleanText($$(el).find('p.news').text());
            const text = cleanText($$(el).find('p.tit a').text());
            const targetDate = cleanText($$(el).find('p.date').text());
            const urlScript = $$(el).find('p.tit a').attr('href');
            const urlMatch = urlScript ? urlScript.match(/'([^']+)'/) : null;
            const url = urlMatch ? urlMatch[1] : null;

            synthesizedData.언론.push({ targetDate, type: '기사', text, url, issuer });
        });

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
    const doctorDataJson = process.argv[2];
    if (!doctorDataJson) {
        console.error("Please provide the doctor's JSON data as a string argument.");
        process.exit(1);
    }

    const doctorData = JSON.parse(doctorDataJson);

    parseDoctorProfile(doctorData)
        .then(result => {
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(error => {
            console.error(`A critical error occurred:`, error);
            console.log(JSON.stringify({ error: error.message }, null, 2));
        });
}
