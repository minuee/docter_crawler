const { chromium } = require('playwright');
const fs = require('fs');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s\s+/g, ' ').trim() : '';
};

// 파싱 메인 함수
async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 학술: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        // '의료진' 탭을 클릭하여 목록을 표시합니다.
        await page.locator('button.tabType1Btn:has-text("의료진")').click();
        await page.waitForSelector('.deptInfoView2[style*="display: block"]', { timeout: 5000 });

        // 의사 목록에서 해당 의사 컨테이너 찾기
        const doctorListItem = page.locator(`.doctorListType1Item[data-docname="${doctorData.bedoc_doctorname}"]`);
        if (await doctorListItem.count() === 0) {
            throw new Error(`Doctor ${doctorData.bedoc_doctorname} not found on the list page.`);
        }
        isAttend = true;

        // 기본 정보 추출
        synthesizedData.profileUrl = await doctorListItem.locator('.doc_img img').getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        synthesizedData.specialty = await doctorListItem.locator('.doc_part').innerText().then(cleanText);

        // 상세정보 버튼 클릭
        await doctorListItem.locator('button:has-text("상세정보")').click();

        // 상세정보 컨테이너가 보일 때까지 대기
        const doctorDetailContainer = page.locator(`.doctorListType2Item[data-no="${await doctorListItem.getAttribute('data-no')}"]`);
        await doctorDetailContainer.waitFor({ state: 'visible', timeout: 5000 });

        // 상세 정보 추출
        const parseDetailSection = async (title) => {
            const sectionLocator = doctorDetailContainer.locator(`div:has(> .dlt2i_title:text-is('${title}'))`);
            if (await sectionLocator.count() > 0) {
                return sectionLocator.locator('.itemList li').evaluateAll(nodes => 
                    nodes.map(n => ({ date: null, content: n.textContent.trim() }))
                );
            }
            return [];
        };

        synthesizedData.학력 = await parseDetailSection('학력');
        synthesizedData.경력 = await parseDetailSection('경력');
        synthesizedData.학술 = await parseDetailSection('학회활동');

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
    const doctorFilePath = process.argv[2];
    if (!doctorFilePath) {
        console.error("Please provide the path to the doctor's JSON file.");
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Failed to read or parse file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };
            updatedDoctorData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedDoctorData.isExist = !result.error;
            updatedDoctorData.isAttend = result.isAttend;
            delete updatedDoctorData.error;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated successfully: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`A critical error occurred for ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
