
const { chromium } = require('playwright');
const fs = require('fs');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function clickMoreButtonFinal(page, sectionSelector) {
    const itemSelector = sectionSelector.includes('news') ? `${sectionSelector} .grid-item` : `${sectionSelector} li`;
    const moreButtonSelector = `${sectionSelector} .more_btn a`;
    console.log(`[더보기 수정] ${sectionSelector} 영역 처리 시작...`);

    for (let i = 0; i < 15; i++) { // Max 15 attempts
        try {
            const button = page.locator(moreButtonSelector);
            if (await button.count() === 0 || !await button.isVisible()) {
                console.log(`[더보기 수정] 버튼이 없거나 보이지 않음. 종료.`);
                break;
            }

            const prevCount = await page.locator(itemSelector).count();
            console.log(`[더보기 수정] 클릭 ${i + 1} 시도 전 항목 수: ${prevCount}`);

            await button.click({ timeout: 3000 });
            
            // Wait for network to be idle, indicating new content has likely loaded.
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            
            const currentCount = await page.locator(itemSelector).count();
            console.log(`[더보기 수정] 클릭 ${i + 1} 시도 후 항목 수: ${currentCount}`);

            if (currentCount === prevCount) {
                console.log(`[더보기 수정] 항목 수가 증가하지 않음. 마지막 페이지로 간주하고 종료.`);
                break;
            }

        } catch (e) {
            console.log(`[더보기 수정] '더보기' 버튼 클릭 중 오류 또는 타임아웃 발생: ${e.message}. 다음으로 진행합니다.`);
            break;
        }
    }
}

async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 연수: [], 수상: [], 학술: [], 논문: [], 저서: [], 언론: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });
        if ((await page.textContent('body')).includes(doctorData.bedoc_doctorname)) isAttend = true;

        // --- Step 1: Parse the default "Profile" tab ---
        synthesizedData.profileUrl = await page.locator('img[src*="/api/attach/view/doctor/"]').first().getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        synthesizedData.specialty = cleanText(await page.locator('.doc_intro_txt dl dd p').innerText());

        const profileContainer = page.locator('.cont_main_profile');
        
        // Expand sections within the main profile (e.g., awards, activities)
        const profileMoreButtons = profileContainer.locator('.profile_view_more a');
        for (let i = 0; i < await profileMoreButtons.count(); i++) {
            try {
                await profileMoreButtons.nth(i).click({ timeout: 1000 });
                await page.waitForTimeout(300);
            } catch(e){ /* ignore */ }
        }

        const parseProfileSection = async (title) => {
            const sectionDiv = profileContainer.locator(`div:has(> strong:text-is("${title}"))`);
            if (await sectionDiv.count() === 0) return [];
            return sectionDiv.locator('ul li').evaluateAll(nodes => nodes.map(n => ({ date: n.querySelector('dt')?.textContent.trim() || null, content: n.querySelector('dd')?.textContent.trim() || null, })) );
        };

        synthesizedData.학력 = await parseProfileSection('학력');
        synthesizedData.경력 = await parseProfileSection('경력');
        synthesizedData.연수 = await parseProfileSection('연수');
        synthesizedData.수상 = await parseProfileSection('수상이력');
        synthesizedData.학술 = await parseProfileSection('학회활동');

        // --- Step 2: Handle Thesis (논문) Tab ---
        const thesisTab = page.locator('a:has-text("논문")');
        if (await thesisTab.count() > 0) {
            await thesisTab.click();
            await page.waitForTimeout(500); // wait for tab content to appear
            await clickMoreButtonFinal(page, '.thesis_list');
            const rawTheses = await page.locator('.thesis_list li').evaluateAll(nodes => nodes.map(n => { const title = n.querySelector('.title p')?.textContent || ''; const info = n.querySelector('.info')?.textContent || ''; return `${title} (${info})`; }));
            synthesizedData.논문 = rawTheses.map(item => cleanText(item));
        }

        // --- Step 3: Handle Books (저서) Tab ---
        const booksTab = page.locator('a:has-text("저서")');
        if (await booksTab.count() > 0) {
            await booksTab.click();
            await page.waitForTimeout(500);
            await clickMoreButtonFinal(page, '.book_list');
            const rawBooks = await page.locator('.book_list li').evaluateAll(nodes => nodes.map(n => ({ date: n.querySelector('.date_wrap')?.textContent.trim() || null, content: n.querySelector('.title p')?.textContent || '', issuer: n.querySelector('.info .public')?.textContent || '', })));
            synthesizedData.저서 = rawBooks.map(item => ({ ...item, content: cleanText(item.content), issuer: cleanText(item.issuer) }));
        }
        
        // --- Step 4: Handle News/Media (뉴스/영상) Tab ---
        const newsTab = page.locator('a:has-text("뉴스/영상")');
        if (await newsTab.count() > 0) {
            await newsTab.click();
            await page.waitForTimeout(500);
            await clickMoreButtonFinal(page, '.news_list');
            const rawMedia = await page.locator('.news_list .grid-item').evaluateAll(nodes => nodes.map(n => ({ targetDate: n.querySelector('.date')?.textContent.trim() || null, type: n.querySelector('.info_wrap .title')?.textContent || '기사', text: n.querySelector('.cont_wrap p')?.textContent || '', url: n.querySelector('a')?.href || null, })));
            synthesizedData.언론 = rawMedia.map(item => ({ ...item, type: cleanText(item.type), text: cleanText(item.text) }));
        }

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false;
    } finally {
        if (browser) { await browser.close(); }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    Object.keys(finalResult).forEach(key => { if (Array.isArray(finalResult[key]) && finalResult[key].length === 0) { delete finalResult[key]; } });

    return finalResult;
}

if (require.main === module) {
    const doctorFilePath = process.argv[2];
    let doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };
            updatedDoctorData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedDoctorData.isExist = !result.error;
            updatedDoctorData.isAttend = result.isAttend;
            delete updatedDoctorData.education; delete updatedDoctorData.experience; delete updatedDoctorData.thesis; delete updatedDoctorData.error;
            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated successfully: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error: ${doctorFilePath}`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
