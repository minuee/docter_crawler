
const { chromium } = require('playwright');
const fs = require('fs');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

// 최종 "더보기" 함수
async function clickMoreButtonFinal(page, sectionSelector) {
    const listSelector = sectionSelector.includes('news') ? `${sectionSelector} .grid_wrap` : `${sectionSelector} .list_wrap ul`;
    const itemSelector = sectionSelector.includes('news') ? `${sectionSelector} .grid-item` : `${sectionSelector} li`;
    const moreButtonSelector = `${sectionSelector} .more_btn a`;
    console.log(`[더보기 최종] ${sectionSelector} 영역 처리 시작...`);

    for (let i = 0; i < 15; i++) { // 최대 15번까지만 시도
        try {
            const button = page.locator(moreButtonSelector);
            if (await button.count() === 0) {
                console.log(`[더보기 최종] 버튼 없음. 종료.`);
                break;
            }

            const prevCount = await page.locator(itemSelector).count();
            
            await button.hover({ timeout: 1000 });
            await button.dispatchEvent('click');
            
            await page.waitForFunction(
                (selector, prevCount) => document.querySelectorAll(selector).length > prevCount,
                itemSelector,
                prevCount,
                { timeout: 5000 }
            );

            const currentCount = await page.locator(itemSelector).count();
            console.log(`[더보기 최종] 클릭 ${i + 1}: 이전 ${prevCount}개 -> 현재 ${currentCount}개`);

        } catch (e) {
            console.log(`[더보기 최종] 더 이상 항목이 없거나 오류 발생. 종료합니다.`);
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

        synthesizedData.profileUrl = await page.locator('img[src*="/api/attach/view/doctor/"]').first().getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        synthesizedData.specialty = cleanText(await page.locator('.doc_intro_txt dl dd p').innerText());

        const profileContainer = page.locator('.cont_main_profile');
        const profileMoreButtons = profileContainer.locator('.profile_view_more a');
        for (let i = 0; i < await profileMoreButtons.count(); i++) {
            while(true){
                try {
                    await profileMoreButtons.nth(i).click({ timeout: 1000 });
                    await page.waitForTimeout(300);
                } catch(e){ break; }
            }
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

        await clickMoreButtonFinal(page, '.thesis_list');
        await clickMoreButtonFinal(page, '.book_list');
        await clickMoreButtonFinal(page, '.news_list');

        const rawTheses = await page.locator('.thesis_list li').evaluateAll(nodes => nodes.map(n => { const title = n.querySelector('.title p')?.textContent || ''; const info = n.querySelector('.info')?.textContent || ''; return `${title} (${info})`; }));
        synthesizedData.논문 = rawTheses.map(item => cleanText(item));

        const rawBooks = await page.locator('.book_list li').evaluateAll(nodes => nodes.map(n => ({ date: n.querySelector('.date_wrap')?.textContent.trim() || null, content: n.querySelector('.title p')?.textContent || '', issuer: n.querySelector('.info .public')?.textContent || '', })));
        synthesizedData.저서 = rawBooks.map(item => ({ ...item, content: cleanText(item.content), issuer: cleanText(item.issuer) }));

        const rawMedia = await page.locator('.news_list .grid-item').evaluateAll(nodes => nodes.map(n => ({ targetDate: n.querySelector('.date')?.textContent.trim() || null, type: n.querySelector('.info_wrap .title')?.textContent || '기사', text: n.querySelector('.cont_wrap p')?.textContent || '', url: n.querySelector('a')?.href || null, })));
        synthesizedData.언론 = rawMedia.map(item => ({ ...item, type: cleanText(item.type), text: cleanText(item.text) }));

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
