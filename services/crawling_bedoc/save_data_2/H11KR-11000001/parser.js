const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

// "더보기" 버튼을 클릭하고 모든 컨텐츠가 로드될 때까지 기다리는 함수
async function clickMoreButton(page, sectionSelector) {
    const sectionLocator = page.locator(sectionSelector);

    try {
        await sectionLocator.waitFor({ state: 'visible', timeout: 5000 });
    } catch (e) {
        console.warn(`Section not found or not visible: ${sectionSelector}`);
        return false;
    }

    const commonMoreButtonSubSelectors = [
        'span.profile_view_more a',
        'span.more_btn a',
        'a:has-text("더보기")',
        'button:has-text("더보기")'
    ];

    let clickedAnyButton = false;
    let moreButtonsMightExist = true;

    while (moreButtonsMightExist) {
        let buttonWasClickedInThisIteration = false;
        for (const subSelector of commonMoreButtonSubSelectors) {
            const moreButton = sectionLocator.locator(subSelector);
            if (await moreButton.count() > 0 && await moreButton.isVisible()) {
                try {
                    await moreButton.click();
                    await page.waitForTimeout(1000); // 잠시 대기
                    buttonWasClickedInThisIteration = true;
                    clickedAnyButton = true;
                } catch (clickError) {
                    // console.warn(`Failed to click '더보기' button with sub-selector ${subSelector}`);
                }
            }
        }
        moreButtonsMightExist = buttonWasClickedInThisIteration;
    }

    return clickedAnyButton;
}

// 각 섹션의 데이터를 파싱하는 함수
async function parseSection(page, selector) {
    const items = [];
    const sectionLocator = page.locator(selector);
    if (await sectionLocator.count() === 0) return items;

    const listItems = await sectionLocator.locator('ul li').all();

    for (const el of listItems) {
        const date = cleanText(await el.locator('dl dt').innerText());
        const content = cleanText(await el.locator('dl dd').innerText());
        if (content) items.push({ date, content });
    }
    return items;
}

// 논문 파싱 함수
async function parsePapers(page, selector) {
    const items = [];
    const sectionLocator = page.locator(selector);
    if (await sectionLocator.count() === 0) return items;
    
    const listItems = await sectionLocator.locator('.list_wrap ul li').all();

    for (const el of listItems) {
        const title = cleanText(await el.locator('.info_wrap .title p').innerText());
        if (title) items.push(title);
    }
    return items;
}

// 저서 파싱 함수
async function parseBooks(page, selector) {
    const items = [];
    const sectionLocator = page.locator(selector);
    if (await sectionLocator.count() === 0) return items;

    const listItems = await sectionLocator.locator('.list_wrap ul li').all();

    for (const el of listItems) {
        const title = cleanText(await el.locator('.info_wrap .title p').innerText());
        const publisher = cleanText(await el.locator('.info_wrap .info .public').innerText());
        const date = cleanText(await el.locator('.date_wrap').innerText()).replace(/\n/g, ' ');
        if (title) items.push({ date, content: title, issuer: publisher });
    }
    return items;
}


async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = {};
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const bodyText = await page.locator('body').innerText();
        if (bodyText.includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        const profileDiv = page.locator('div.cont_bg').first();
        const profileUrl = await profileDiv.getAttribute('data-img-1');
        if (profileUrl) {
            synthesizedData.profileUrl = new URL(profileUrl, doctorData.hospital_site).href;
        }

        const specialtyP = page.locator('div.doc_intro_txt dl dd p');
        if(await specialtyP.count() > 0) {
            synthesizedData.specialty = cleanText(await specialtyP.innerText());
        }


        const staticSections = {
            학력: 'xpath=//strong[contains(text(), "학력")]/ancestor::div[1]',
            경력: 'xpath=//strong[contains(text(), "경력")]/ancestor::div[1]',
            연수: 'xpath=//strong[contains(text(), "연수")]/ancestor::div[1]',
            수상: 'xpath=//strong[contains(text(), "수상이력")]/ancestor::div[1]',
            학술: 'xpath=//strong[contains(text(), "학회활동")]/ancestor::div[1]',
        };

        // Process static sections first
        synthesizedData.학력 = await parseSection(page, staticSections.학력);
        const experience = await parseSection(page, staticSections.경력);
        const training = await parseSection(page, staticSections.연수);
        synthesizedData.경력 = [...experience, ...training];
        synthesizedData.수상 = await parseSection(page, staticSections.수상);
        synthesizedData.학술 = await parseSection(page, staticSections.학술);

        // Handle Papers Tab
        await page.locator('a:has-text("논문")').click();
        await clickMoreButton(page, 'div.thesis_list');
        synthesizedData.논문 = await parsePapers(page, 'div.thesis_list');

        // Handle Books Tab
        await page.locator('a:has-text("저서")').click();
        await clickMoreButton(page, 'div.book_list');
        synthesizedData.저서 = await parseBooks(page, 'div.book_list');


    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        isAttend = false;
    } finally {
        await browser.close();
    }

    const finalResult = { ...synthesizedData, isAttend, error };

    Object.keys(finalResult).forEach(key => {
        const value = finalResult[key];
        if ((Array.isArray(value) && value.length === 0) || value === '' || value === null || value === undefined) {
           delete finalResult[key];
        }
    });

    return finalResult;
}

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
            let updatedDoctorData = { ...doctorData, ...result };

            updatedDoctorData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedDoctorData.isExist = !result.error;
            updatedDoctorData.isAttend = result.isAttend;
            updatedDoctorData.error = result.error || null;

            delete updatedDoctorData.education;
            delete updatedDoctorData.experience;
            delete updatedDoctorData.thesis;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}