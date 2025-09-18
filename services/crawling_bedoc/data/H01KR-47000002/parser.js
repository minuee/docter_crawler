const { chromium } = require('playwright');
const fs = require('fs');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const synthesizedData = { 학력: [], 경력: [], 학술: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = true;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // 1. 재직 여부 확인
        const nameText = await page.evaluate(() => document.querySelector('p.name')?.textContent);
        if (nameText && nameText.includes('(면직')) {
            isAttend = false;
        }

        // 2. 프로필 이미지
        synthesizedData.profileUrl = await page.$eval('p.pic img', img => new URL(img.src, page.url()).href).catch(() => null);

        // 3. 학력, 경력, 학회활동 (공통 테이블 파싱 함수)
        const parseTableData = async (title) => {
            return page.evaluate((title) => {
                const h4 = Array.from(document.querySelectorAll('h4.tit')).find(el => el.textContent.trim() === title);
                if (!h4) return [];
                const table = h4.nextElementSibling;
                if (!table || table.tagName !== 'TABLE') return [];

                const items = [];
                table.querySelectorAll('tbody tr').forEach(row => {
                    const dateEl = row.querySelector('th[scope="row"]');
                    const contentEl = row.querySelector('td.left');
                    if (contentEl) {
                        items.push({
                            date: dateEl ? dateEl.textContent.trim() : null,
                            content: contentEl.textContent.trim(),
                        });
                    }
                });
                return items;
            }, title);
        };

        synthesizedData.학력 = (await parseTableData('학력')).map(item => ({...item, content: cleanText(item.content)}));
        synthesizedData.경력 = (await parseTableData('경력')).map(item => ({...item, content: cleanText(item.content)}));
        synthesizedData.학술 = (await parseTableData('학회활동')).map(item => ({...item, content: cleanText(item.content)}));

        // 4. 연구, 관심분야 (진료분야)
        synthesizedData.specialty = await page.evaluate(() => {
            const h4 = Array.from(document.querySelectorAll('h4.tit')).find(el => el.textContent.trim() === '연구, 관심분야');
            if (!h4) return '';
            let specialties = [];
            let nextEl = h4.nextElementSibling;
            while (nextEl && nextEl.tagName === 'UL') {
                nextEl.querySelectorAll('li').forEach(li => specialties.push(li.textContent.trim()));
                nextEl = nextEl.nextElementSibling;
            }
            return specialties.join(', ');
        });
        synthesizedData.specialty = cleanText(synthesizedData.specialty);

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false; // 에러 발생 시 재직 불확실
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    Object.keys(finalResult).forEach(key => {
        if (Array.isArray(finalResult[key]) && finalResult[key].length === 0) {
            delete finalResult[key];
        }
    });

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