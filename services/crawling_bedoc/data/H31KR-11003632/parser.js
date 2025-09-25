
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(html, doctorName) {
    const $ = cheerio.load(html);
    const synthesizedData = { 학력: [], 경력: [], 학술: [] };
    let doctorNode = null;

    // 의사 이름으로 해당 섹션 찾기
    $('div.text_area div.fr-ltr p > span').each((i, el) => {
        if ($(el).text().includes(doctorName)) {
            doctorNode = $(el).closest('div.normal_module');
            return false; // loop break
        }
    });
     $('div.text_area div.fr-ltr').each((i, el) => {
        if ($(el).text().includes(doctorName)) {
            doctorNode = $(el).closest('div.normal_module');
            return false; // loop break
        }
    });


    if (!doctorNode || doctorNode.length === 0) {
        return { error: `Doctor ${doctorName} not found on the page.` };
    }

    // 프로필 이미지 추출
    const imgSrc = doctorNode.find('img').attr('src');
    if (imgSrc) {
        synthesizedData.profileUrl = new URL(imgSrc, 'https://boazent.co.kr').href;
    }

    let currentCategory = null;
    doctorNode.find('div[data-text-editable="true"] p').each((i, el) => {
        const pText = cleanText($(el).text());
        
        if (!pText) return;

        if (pText.includes('주요약력')) {
            currentCategory = '경력';
            return;
        } else if (pText.includes('주요활동')) {
            currentCategory = '학술';
            return;
        }

        if (currentCategory === '경력') {
            if (pText.includes('학사') || pText.includes('석사') || pText.includes('박사')) {
                synthesizedData.학력.push({ date: null, content: pText });
            } else {
                synthesizedData.경력.push({ date: null, content: pText });
            }
        } else if (currentCategory === '학술') {
            synthesizedData.학술.push({ date: null, content: pText });
        }
    });

    return synthesizedData;
}


(async () => {
    const doctorName = process.argv[2];
    const url = process.argv[3];
    const jsonFilePath = process.argv[4];

    if (!doctorName || !url || !jsonFilePath) {
        console.error('Please provide doctor name, URL, and JSON file path as arguments.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let finalResult = {};
    let originalData = {};
     try {
        originalData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        
        const parsedData = await parseDoctorProfile(html, doctorName);

        finalResult = { ...originalData, ...parsedData };

        if (parsedData.error) {
            finalResult.isSearchType = 'html_playwright_failed';
            finalResult.isExist = false;
            finalResult.error = parsedData.error;
        } else {
            finalResult.isSearchType = 'html_playwright';
            finalResult.isExist = true;
            finalResult.isAttend = true; // Found on page
            delete finalResult.error;
        }

    } catch (error) {
        finalResult = { ...originalData };
        finalResult.isSearchType = 'html_playwright_failed';
        finalResult.isExist = false;
        finalResult.error = error.message;
    } finally {
        await browser.close();
        fs.writeFileSync(jsonFilePath, JSON.stringify(finalResult, null, 2), 'utf-8');
        console.log(`File updated: ${jsonFilePath}`);
    }
})();
