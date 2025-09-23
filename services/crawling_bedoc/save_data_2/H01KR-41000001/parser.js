
const { chromium } = require('playwright');
const fs = require('fs');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site || !doctorData.bedoc_doctorname) {
        throw new Error("Invalid doctor data");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], 언론: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });

        const doctorDiv = await page.locator('.team_list > div', { has: page.locator('a.btn_open', { hasText: doctorData.bedoc_doctorname }) }).first();
        if (!await doctorDiv.isVisible()) {
            throw new Error(`Doctor container for ${doctorData.bedoc_doctorname} not found.`);
        }
        isAttend = true;

        const detailButton = doctorDiv.locator('a.btn_open2:has-text("소개 더보기")');
        const buttonId = await detailButton.getAttribute('id');
        await detailButton.dispatchEvent('click');

        const popupSelector = `#${buttonId.replace('btn_open_', 'layer_pop_')}`;
        await page.waitForSelector(popupSelector + '[style*="display: block"]', { timeout: 5000 });
        const popup = page.locator(popupSelector);

        synthesizedData.profileUrl = await popup.locator('.img_box .img img').first().getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        synthesizedData.specialty = cleanText(await popup.locator('th:has-text("전문분야") + td').innerText());

        const careerTab = popup.locator('ul.tab_menu3 li[rel*="_2"]');
        await careerTab.dispatchEvent('click'); // Force click
        const careerTabContent = popup.locator('.tab_content[id*="_2"]');
        await careerTabContent.waitFor({ state: 'visible' });

        const dls = careerTabContent.locator('dl.dl_type02');
        for (let i = 0; i < await dls.count(); i++) {
            const dtText = await dls.nth(i).locator('dt').innerText();
            const dds = dls.nth(i).locator('dd');
            const items = [];
            for (let j = 0; j < await dds.count(); j++) {
                items.push(cleanText(await dds.nth(j).innerText()));
            }

            if (dtText.includes('경력')) {
                synthesizedData.경력 = items.map(item => ({ date: null, content: item }));
            } else if (dtText.includes('학력')) {
                synthesizedData.학력 = items.map(item => ({ date: null, content: item }));
            } else if (dtText.includes('학회활동')) {
                synthesizedData.학술 = items.map(item => ({ date: null, content: item }));
            } else if (dtText.includes('수상')) {
                synthesizedData.수상 = items.map(item => ({ date: null, content: item }));
            }
        }

        const mediaTab = popup.locator('ul.tab_menu3 li[rel*="_4"]');
        if (await mediaTab.count() > 0) {
            await mediaTab.dispatchEvent('click'); // Force click
            const mediaTabContent = popup.locator('.tab_content[id*="_4"]');
            await mediaTabContent.waitFor({ state: 'visible' });

            const rows = mediaTabContent.locator('table.table_type02 tbody tr');
            for (let i = 0; i < await rows.count(); i++) {
                const row = rows.nth(i);
                const text = await row.locator('td.text_left a').innerText();
                const url = await row.locator('td.text_left a').getAttribute('href');
                const issuer = await row.locator('td:nth-child(3)').innerText();
                const targetDate = await row.locator('td:nth-child(4)').innerText();
                synthesizedData.언론.push({ targetDate, type: '기사', text: cleanText(text), url, issuer: cleanText(issuer) });
            }
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
            delete updatedDoctorData.error;
            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated successfully: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error: ${doctorFilePath}`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
