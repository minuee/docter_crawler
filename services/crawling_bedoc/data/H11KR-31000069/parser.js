
const { chromium } = require('playwright');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

// 각 섹션의 데이터를 파싱하는 함수 (학력, 경력 등)
async function parseProfileSection(page, titleToFind) {
    const items = [];
    const sections = await page.locator('.curri_area .list').all();
    for (const section of sections) {
        const title = await section.locator('.curri_title').innerText();
        if (title.trim() === titleToFind) {
            const listItems = await section.locator('.dot_list li').all();
            for (const li of listItems) {
                const content = cleanText(await li.innerText());
                if (content) {
                    const cleanedContent = content.replace(/\n/g, ' ').replace(/\s+/g, ' ');
                    items.push({ date: null, content: cleanedContent });
                }
            }
            break; // Found the section, no need to loop further
        }
    }
    return items;
}

// 학회/수상 등 복합 섹션 파싱 함수
async function parseComplexSection(page) {
    const complexData = { 학술: [], 수상: [], 경력: [], 저서: [] };
    const sections = await page.locator('.curri_area .list').all();
    for (const section of sections) {
        const title = await section.locator('.curri_title').innerText();
        if (title.includes('학회/연구')) {
            const listItems = await section.locator('.dot_list li').all();
            let currentCategory = '';

            for (const li of listItems) {
                const isPart = await li.evaluate(node => node.classList.contains('part'));
                let text = cleanText(await li.innerText());

                if (isPart) {
                    currentCategory = text;
                } else if (text) {
                    if (currentCategory.includes('학회')) {
                        complexData.학술.push({ date: null, content: text });
                    } else if (currentCategory.includes('수상경력')) {
                        complexData.수상.push({ date: null, content: text });
                    } else if (currentCategory.includes('연구') || currentCategory.includes('Fellowship')) {
                        complexData.경력.push({ date: null, content: text });
                    } else if (currentCategory.includes('저서')) {
                        complexData.저서.push({ date: null, content: text, issuer: null });
                    }
                }
            }
            break;
        }
    }
    return complexData;
}


async function parseTabContent(page, tabRel, listSelector, itemSelector, moreButtonSelector) {
    const items = [];
    const tabLocator = page.locator(`ul.news_tab li[rel="${tabRel}"]`);
    if (await tabLocator.count() === 0) return items;

    await tabLocator.click();
    await page.waitForSelector(listSelector, { state: 'visible', timeout: 5000 }).catch(() => {});

    while (true) {
        const moreButton = page.locator(moreButtonSelector);
        if (await moreButton.count() > 0 && await moreButton.isVisible()) {
            await moreButton.click();
            await page.waitForTimeout(1000);
        } else {
            break;
        }
    }

    const listItems = await page.locator(itemSelector).all();
    for (const li of listItems) {
        const text = cleanText(await li.innerText());
        if (text) {
            items.push(text.replace(/^\d+\s*/, '').trim());
        }
    }
    return items;
}


async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const synthesizedData = {};
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const doctorNameLocator = page.locator('.doctor_txt .doctor_name');
        if (await doctorNameLocator.count() > 0) {
            const nameText = await doctorNameLocator.innerText();
            if (nameText.includes(doctorData.bedoc_doctorname)) {
                isAttend = true;
            }
        }

        const profileImgLocator = page.locator('.profile_topImg img');
        if (await profileImgLocator.count() > 0) {
            const profileImgSrc = await profileImgLocator.getAttribute('src');
            if (profileImgSrc) {
                synthesizedData.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
            }
        }

        const specialtyLocator = page.locator('div.special_explain');
        if (await specialtyLocator.count() > 0) {
            synthesizedData.specialty = cleanText(await specialtyLocator.innerText());
        }

        // 학력, 경력 파싱
        synthesizedData.학력 = await parseProfileSection(page, "학력사항");
        const experience1 = await parseProfileSection(page, "교수 경력");
        const experience2 = await parseProfileSection(page, "진료 경력");

        // 복합 섹션 파싱 (학회, 수상, 연구, 저서 등)
        const complexData = await parseComplexSection(page);

        synthesizedData.경력 = [...experience1, ...experience2, ...complexData.경력];
        synthesizedData.학술 = complexData.학술;
        synthesizedData.수상 = complexData.수상;
        synthesizedData.저서 = complexData.저서;

        // 논문 탭 파싱
        synthesizedData.논문 = await parseTabContent(page, 'paper', 'ol.thesisList', 'ol.thesisList li', '.thesisBtn');

        // 언론 탭 파싱
        const articleTab = page.locator('ul.news_tab li[rel="article"]');
        if (await articleTab.count() > 0) {
            await articleTab.click();
            await page.waitForSelector('ul#tiles', { state: 'visible', timeout: 5000 }).catch(() => {});

            while(true) {
                const moreButton = page.locator('.boardBtn');
                if (await moreButton.count() > 0 && await moreButton.isVisible()) {
                    await moreButton.click();
                    await page.waitForTimeout(1000);
                } else {
                    break;
                }
            }

            const articles = await page.locator('ul#tiles li').all();
            const 언론 = [];
            for (const li of articles) {
                const text = cleanText(await li.locator('.txt').innerText());
                const date = cleanText(await li.locator('.date').innerText());
                const url = await li.locator('a').getAttribute('href');
                if (text) {
                    언론.push({ targetDate: date, type: '기사', text: text, url: url ? new URL(url, doctorData.hospital_site).href : null, issuer: null });
                }
            }
            synthesizedData.언론 = 언론;
        }


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
            const updatedDoctorData = { ...doctorData, ...result };

            if (result.error) {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
            } else {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
            }
            updatedDoctorData.isAttend = result.isAttend;

            if (result.error) {
                updatedDoctorData.error = result.error;
            } else {
                delete updatedDoctorData.error;
            }

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
