
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], 논문: [], 언론: [] };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });

        if ((await page.content()).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 프로필 이미지 및 진료분야 추출
        synthesizedData.profileUrl = await page.locator('.doc_pic_wrap .slick-current img').getAttribute('src').then(src => new URL(src, doctorData.hospital_site).href).catch(() => null);
        const specialties = await page.locator('.part_box .part_dec').allTextContents();
        synthesizedData.specialty = specialties.map(s => cleanText(s)).join(', ');

        // '학력/경력/활동' 탭 클릭 및 파싱
        await page.click('#tab_3');
        await page.waitForTimeout(1000); // Allow time for tab content to render

        const eduItems = await page.locator('h6:has-text("학력") + ul.bh_normal_middot_ul li').allTextContents();
        eduItems.forEach(item => synthesizedData.학력.push({ content: cleanText(item) }));

        const expItems = await page.locator('h6:has-text("경력") + ul.bh_normal_middot_ul li').allTextContents();
        expItems.forEach(item => synthesizedData.경력.push({ content: cleanText(item) }));

        const awardItems = await page.locator('h6:has-text("수상") + ul.bh_normal_middot_ul li').allTextContents();
        awardItems.forEach(item => synthesizedData.수상.push({ content: cleanText(item) }));

        const activityItems = await page.locator('h6:has-text("활동") + ul.bh_normal_middot_ul li').allTextContents();
        activityItems.forEach(item => synthesizedData.학술.push({ content: cleanText(item) }));

        // '연구업적' 탭 클릭 및 파싱
        await page.click('#tab_4');
        await page.waitForSelector('#cont_wrap4', { state: 'visible', timeout: 5000 });
        while (true) {
            const paperMoreButton = await page.locator('#cont_wrap4 .btn_more_p a:visible');
            if (await paperMoreButton.count() === 0) {
                break;
            }
            await paperMoreButton.click();
            await page.waitForTimeout(1000);
        }
        const paperElements = await page.locator('#cont_wrap4 ul.bh_normal_middot_ul li').elementHandles();
        for (const el of paperElements) {
            const title = await el.$eval('.title', node => node.textContent.trim()).catch(() => '');
            const from = await el.$eval('.from', node => node.textContent.trim()).catch(() => '');
            const etc = await el.$eval('.etc', node => node.textContent.trim()).catch(() => '');
            synthesizedData.논문.push(cleanText(`${title} (${from}, ${etc})`));
        }

        // '언론/진료과 소식' 탭 클릭 및 파싱
        await page.click('#tab_5');
        await page.waitForSelector('#cont_wrap5', { state: 'visible', timeout: 5000 });
        while (true) {
            const articleMoreButton = await page.locator('#cont_wrap5 .btn_more_p a:visible');
            if (await articleMoreButton.count() === 0) {
                break;
            }
            await articleMoreButton.click();
            await page.waitForTimeout(1000);
        }
        const articles = await page.locator('#cont_wrap5 .tbody ul li').elementHandles();
        for (const article of articles) {
            const title = await article.locator('.subject a').textContent();
            const date = await article.locator('.date').textContent();
            synthesizedData.언론.push({ targetDate: cleanText(date), text: cleanText(title) });
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
        if (Array.isArray(finalResult[key]) && finalResult[key].length === 0) { delete finalResult[key]; }
    });
    return finalResult;
}

if (require.main === module) {
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
            delete updatedDoctorData.error;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
