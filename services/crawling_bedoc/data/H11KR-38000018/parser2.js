
const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    const url = process.argv[2];
    const doctorName = process.argv[3]; // 의사 이름을 인자로 받음

    if (!url || !doctorName) {
        console.error('Please provide a URL and doctor name as arguments.');
        process.exit(1);
    }

    const outputFilePath = 'parser_output.json';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const synthesizedData = { 학력: [], 경력: [], 학술: [], specialty: null, profileUrl: null, isAttend: false };

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        // 페이지가 완전히 로드되기를 기다리는 추가 시간
        await page.waitForTimeout(3000);

        const html = await page.content();
        const $ = cheerio.load(html);

        // isAttend 확인
        if ($('body').text().includes(doctorName)) {
            synthesizedData.isAttend = true;
        }

        // 프로필 이미지
        let profileImgSrc = $('.profile .photo img').attr('src');
        if (profileImgSrc && !profileImgSrc.includes('gnuh_429x646.gif')) { // placeholder가 아닌 경우
            synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
        }

        // 전문분야
        synthesizedData.specialty = $('.doctor_major .title span').text().trim();

        // 주요경력, 학력, 경력
        const experienceP = $('h4.titTypeA:contains("주요경력")').nextAll('p.txtTypeF').first();
        if (experienceP.length) {
            const htmlContent = experienceP.html();
            if (htmlContent) {
                htmlContent.split('<br>').forEach(line => {
                    const cleanedLine = line.replace(/&nbsp;/g, ' ').trim();
                    if (cleanedLine) {
                        if (cleanedLine.includes('학사') || cleanedLine.includes('석사') || cleanedLine.includes('박사') || cleanedLine.includes('졸업')) {
                            synthesizedData.학력.push({ date: null, content: cleanedLine });
                        } else {
                            synthesizedData.경력.push({ date: null, content: cleanedLine });
                        }
                    }
                });
            }
        }

        // 등록학회
        const academicP = $('h4.titTypeA:contains("등록학회")').nextAll('p.txtTypeF').first();
        if (academicP.length) {
            const htmlContent = academicP.html();
            if (htmlContent) {
                htmlContent.split('<br>').forEach(line => {
                    const cleanedLine = line.replace(/&nbsp;/g, ' ').trim();
                    if (cleanedLine) {
                        synthesizedData.학술.push({ date: null, content: cleanedLine });
                    }
                });
            }
        }

        fs.writeFileSync(outputFilePath, JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        fs.writeFileSync(outputFilePath, JSON.stringify({ error: e.message, stack: e.stack }));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
