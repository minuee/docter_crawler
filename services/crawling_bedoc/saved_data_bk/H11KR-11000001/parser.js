const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

// "더보기" 버튼을 클릭하고 모든 컨텐츠가 로드될 때까지 기다리는 함수
async function clickMoreButton(page, sectionSelector) {
    const sectionLocator = page.locator(sectionSelector); // Create a locator for the section

    // Add logging for the section's content
    console.log(`--- Inspecting section: ${sectionSelector} ---`);
    try {
        const sectionContent = await sectionLocator.innerText({ timeout: 5000 });
        console.log(`Section content (first 500 chars): ${sectionContent.substring(0, 500)}...`);
    } catch (e) {
        console.warn(`Could not get innerText for section ${sectionSelector}: ${e.message}`);
    }

    const commonMoreButtonSubSelectors = [ // These are sub-selectors relative to the section
        'span.more_btn a',
        'a:has-text("더보기")',
        'button:has-text("더보기")',
        '.btn_more',
        '[class*="more_btn"] a',
        '[class*="more_btn"] button'
    ];

    let clickedAnyButton = false;
    let moreButtonsMightExist = true;

    while (moreButtonsMightExist) {
        let buttonWasClickedInThisIteration = false;

        for (const subSelector of commonMoreButtonSubSelectors) {
            // Use sectionLocator.locator() to find the button within the section
            const moreButton = sectionLocator.locator(subSelector);
            if (await moreButton.count() > 0 && await moreButton.isVisible()) {
                console.log(`Attempting to click '더보기' button with sub-selector: ${subSelector} in section: ${sectionSelector}`);
                try {
                    await moreButton.click();
                    await page.waitForLoadState('networkidle', { timeout: 10000 });
                    console.log(`Clicked '더보기' button with sub-selector: ${subSelector} in section: ${sectionSelector}`);
                    buttonWasClickedInThisIteration = true;
                    clickedAnyButton = true;
                } catch (clickError) {
                    console.warn(`Failed to click '더보기' button with sub-selector ${subSelector} in section ${sectionSelector}: ${clickError.message}`);
                }
            }
        }

        if (buttonWasClickedInThisIteration) {
            moreButtonsMightExist = true;
        } else {
            moreButtonsMightExist = false;
        }
    }

    if (!clickedAnyButton) {
        console.log(`No clickable '더보기' button found for section: ${sectionSelector} after all attempts.`);
    }
    return clickedAnyButton;
}

// 각 섹션의 데이터를 파싱하는 함수 (Playwright 버전)
async function parseSectionPlaywright(page, selector, isDateContent = true) {
    const items = [];
    const sectionLocator = page.locator(selector);
    const listItems = await sectionLocator.locator('ul li').all(); // Get all li elements within the section

    for (const el of listItems) {
        if (isDateContent) {
            const date = cleanText(await el.locator('dt').innerText());
            const content = cleanText(await el.locator('dd').innerText());
            if (content) items.push({ date, content });
        } else {
             const itemText = cleanText(await el.innerText());
             if(itemText) items.push(itemText);
        }
    }
    return items;
}

// 논문 파싱 함수 (Playwright 버전)
async function parsePapersPlaywright(page, selector) {
    const items = [];
    const sectionLocator = page.locator(selector);
    const listItems = await sectionLocator.locator('li').all();

    for (const el of listItems) {
        const titleLocator = el.locator('div.title p');
        let title = '';
        if (await titleLocator.isVisible()) {
            title = cleanText(await titleLocator.innerText());
        } else {
            console.warn(`Title element not found or not visible for a paper in section: ${selector}`);
            continue; // Skip this item if title is not found
        }

        const journalLocator = el.locator('em.public');
        let journal = '';
        if (await journalLocator.isVisible()) {
            journal = cleanText(await journalLocator.innerText());
        } else {
            console.warn(`Journal element not found or not visible for a paper in section: ${selector}`);
        }

        const authorRuleLocator = el.locator('em.author');
        let authorRule = '';
        if (await authorRuleLocator.isVisible()) {
            authorRule = cleanText(await authorRuleLocator.innerText());
        } else {
            console.warn(`Author element not found or not visible for a paper in section: ${selector}`);
        }

        const dateLocator = el.locator('div.date_wrap');
        let date = '';
        if (await dateLocator.isVisible()) {
            date = cleanText(await dateLocator.innerText());
        } else {
            console.warn(`Date element not found or not visible for a paper in section: ${selector}`);
        }

        if (title) items.push(`${title} (${journal}, ${date}, ${authorRule})`);
    }
    return items;
}

// 저서 파싱 함수 (Playwright 버전)
async function parseBooksPlaywright(page, selector) {
    const items = [];
    const sectionLocator = page.locator(selector);
    const listItems = await sectionLocator.locator('li').all();

    for (const el of listItems) {
        const title = cleanText(await el.locator('div.title p').innerText());
        const publisher = cleanText(await el.locator('em.public').innerText());
        const date = cleanText(await el.locator('div.date_wrap').innerText());
        if (title) items.push({ date, content: title, issuer: publisher });
    }
    return items;
}

// 언론 파싱 함수 (Playwright 버전)
async function parseMediaPlaywright(page, selector) {
    const items = [];
    const sectionLocator = page.locator(selector);
    const listItems = await sectionLocator.locator('li').all();

    for (const el of listItems) {
        const titleLocator = el.locator('div.title p');
        let title = '';
        if (await titleLocator.isVisible()) { // Check if the title element is visible
            title = cleanText(await titleLocator.innerText());
        } else {
            console.warn(`Title element not found or not visible for an item in section: ${selector}`);
            continue; // Skip this item if title is not found
        }

        const url = await el.locator('a').getAttribute('href');
        const date = cleanText(await el.locator('div.date_wrap').innerText());
        const type = cleanText(await el.locator('div.info em.public').innerText());
        if (title) items.push({ targetDate: date, type, text: title, url, issuer: null });
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
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });
        
        // 페이지에 의사 이름이 있는지 확인하여 재직 여부 판단
        const bodyText = await page.locator('body').innerText();
        if (bodyText.includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 프로필 이미지 URL 추출
        const profileDiv = page.locator('div.cont_bg').first();
        const bgImage = await profileDiv.evaluate(el => window.getComputedStyle(el).backgroundImage);
        if (bgImage && bgImage.includes('url("')) {
            const urlMatch = bgImage.match(/url\(\"(.+?)\"\)/);
            if (urlMatch && urlMatch[1]) {
                synthesizedData.profileUrl = new URL(urlMatch[1], doctorData.hospital_site).href;
            }
        }
        
        // 각 섹션에 대해 "더보기" 클릭
        const sections = {
                        specialty: 'xpath=(//strong[contains(text(), "진료분야")]/ancestor::div[1])[1]', // Select the first matching element,
            학력: 'xpath=//strong[contains(text(), "학력")]/ancestor::div[1]',
            경력: 'xpath=//strong[contains(text(), "경력")]/ancestor::div[1]',
            수상: 'xpath=//strong[contains(text(), "수상이력")]/ancestor::div[1]',
            학술: 'xpath=//strong[contains(text(), "학회활동")]/ancestor::div[1]',
            논문: 'div.thesis_list',
            저서: 'div.book_list',
            언론: 'div.news_list'
        };

        for (const key in sections) {
            await clickMoreButton(page, sections[key]);
        }

        // 모든 "더보기"가 클릭된 후의 최종 페이지 컨텐츠를 가져옴
        const finalContent = await page.content();
        fs.writeFileSync(path.join(__dirname, 'temp_윤형규_profile.html'), finalContent, 'utf-8'); // Save HTML to a file in the same directory as parser.js
        console.log('Saved final HTML content to ' + path.join(__dirname, 'temp_윤형규_profile.html'));
        
        

        // 최종 컨텐츠에서 데이터 파싱
        synthesizedData.specialty = await parseSectionPlaywright(page, sections.specialty, false);
        synthesizedData.학력 = await parseSectionPlaywright(page, sections.학력);
        synthesizedData.경력 = await parseSectionPlaywright(page, sections.경력);
        synthesizedData.수상 = await parseSectionPlaywright(page, sections.수상);
        synthesizedData.학술 = await parseSectionPlaywright(page, sections.학술);
        synthesizedData.논문 = await parsePapersPlaywright(page, sections.논문);
        synthesizedData.저서 = await parseBooksPlaywright(page, sections.저서);
        synthesizedData.언론 = await parseMediaPlaywright(page, sections.언론);

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        isAttend = false; // 에러 발생 시 재직 여부를 false로 설정
    } finally {
        await browser.close();
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    
    // 빈 배열이나 null 값인 속성 제거
    Object.keys(finalResult).forEach(key => {
        const value = finalResult[key];
        if ((Array.isArray(value) && value.length === 0) || value === '' || value === null || value === undefined) {
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
            let updatedDoctorData = { ...doctorData, ...result };

            updatedDoctorData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedDoctorData.isExist = !result.error;
            updatedDoctorData.isAttend = result.isAttend;
            updatedDoctorData.error = result.error || null;
            
            // 기존의 불완전한 필드들을 삭제
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