/**
 * @file 민트병원 (Mint Hospital) Playwright Parser
 * @description
 * 이 파서는 민트병원 의료진 목록 페이지에서 의사 정보를 추출합니다.
 *
 * ### 작업 흐름 (Workflow)
 * 1. **페이지 이동**: `hospital_site` (의료진 목록 페이지)로 이동합니다.
 * 2. **팝업 트리거**: `doctor_name`을 포함하는 링크 (예: "기경도 원장 상세보기")를 클릭하여 상세 정보 팝업을 엽니다.
 * 3. **Iframe 전환**: 팝업은 `iframe` 내에 로드됩니다. 스크립트는 이 `iframe`으로 컨텍스트를 전환합니다.
 * 4. **콘텐츠 로드 대기**: `iframe` 내부의 특정 요소(예: '약력' 제목)가 나타날 때까지 기다려 `iframe` 콘텐츠가 완전히 로드되도록 보장합니다.
 * 5. **데이터 추출**: `iframe` 내부의 HTML에서 '약력', '진료분야', '논문' 등의 텍스트를 추출합니다.
 * 6. **데이터 저장**: 추출된 데이터를 원본 JSON 파일에 병합하고, `isSearchType`을 'html_playwright'로 업데이트한 후 덮어씁니다.
 *
 * ### 실행 방법 (Usage)
 * node parser.js <json_file_path> <doctor_name> <hospital_site>
 * e.g., node parser.js ./기경도.json "기경도" "https://mintir.com/page/2_2.php"
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function parseDoctorProfile() {
    const [json_file_path, doctor_name, hospital_site] = process.argv.slice(2);

    if (!json_file_path || !doctor_name || !hospital_site) {
        console.error('Usage: node parser.js <json_file_path> <doctor_name> <hospital_site>');
        process.exit(1);
    }

    let originalData = {};
    try {
        originalData = JSON.parse(fs.readFileSync(json_file_path, 'utf-8'));
    } catch (e) {
        console.error(`Failed to read or parse JSON file: ${e.message}`);
        // Continue without original data if not essential for parsing
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], specialty: null, isAttend: false };

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded' });

        // 1. Click the link to open the modal
        const doctorLink = page.locator(`a:has-text('${doctor_name} 원장 상세보기')`);
        if (await doctorLink.count() > 0) {
            await doctorLink.click();
            // Wait for the iframe of the modal to appear
            await page.waitForSelector('iframe[src*="2_2_doctor_load.php"] ', { timeout: 10000 });
        }

        // 2. Switch to the iframe context
        const frame = page.frameLocator('iframe[src*="2_2_doctor_load.php"] ');

        // Check for doctor's name within the frame to confirm attendance
        const frameHtml = await frame.locator('body').innerHTML();
        if (frameHtml.includes(doctor_name)) {
            synthesizedData.isAttend = true;
        }

        // 3. Extract data from within the iframe
        const profileItems = await frame.locator('h4:has-text("약력") + p').innerHTML();
        const specialties = await frame.locator('h4:has-text("진료분야") + p').innerHTML();
        const papers = await frame.locator('h4:has-text("논문") + p').innerHTML();
        const books = await frame.locator('h4:has-text("저서") + p').innerHTML();

        // Process 약력 (History)
        profileItems.split('<br>').forEach(item => {
            const cleanItem = item.replace(/·/g, '').trim();
            if (!cleanItem) return;
            if (cleanItem.includes('학사') || cleanItem.includes('석사') || cleanItem.includes('박사') || cleanItem.includes('졸업')) {
                synthesizedData.학력.push({ date: null, content: cleanItem });
            } else {
                synthesizedData.경력.push({ date: null, content: cleanItem });
            }
        });

        // Process 진료분야 (Specialty)
        synthesizedData.specialty = specialties.split('<br>').map(s => s.replace(/·/g, '').trim()).filter(Boolean).join(', ');

        // Process 논문 (Papers)
        synthesizedData.논문 = papers.split('<br>').map(p => p.replace(/·/g, '').trim()).filter(Boolean);
        
        // Process 저서 (Books)
        synthesizedData.저서 = books.split('<br>').map(b => b.replace(/·/g, '').trim()).filter(Boolean);

        // Update original data
        const finalData = { ...originalData, ...synthesizedData };
        finalData.isSearchType = 'html_playwright';
        finalData.isExist = true;
        delete finalData.error;

        fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`Successfully parsed and updated data for ${doctor_name}.`);

    } catch (e) {
        console.error(`Error parsing profile for ${doctor_name}:`, e.stack);
        const errorData = { ...originalData, isSearchType: 'html_playwright_failed', error: e.message };
        fs.writeFileSync(json_file_path, JSON.stringify(errorData, null, 2), 'utf-8');
    } finally {
        await browser.close();
    }
}

parseDoctorProfile();