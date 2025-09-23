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

    const synthesizedData = { 학력: [], 경력: [], 논문: [], 언론: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const bodyText = await page.textContent('body');
        if (bodyText.includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = await page.$eval('.doctor_img .inner img', img => new URL(img.src, page.url()).href).catch(() => null);

        // 수정된 전문분야 로직
        synthesizedData.specialty = cleanText(await page.evaluate(() => {
            const pElements = Array.from(document.querySelectorAll('.d_subject p'));
            const specialtyP = pElements.find(p => p.textContent.trim() === '전문분야');
            return specialtyP ? specialtyP.nextElementSibling.textContent.trim() : '';
        }));

        const mainHistoryData = await page.evaluate(() => {
            const container = document.querySelector('#tab1');
            if (!container) return {};
            const data = { education: [], experience: [], theses: [] };
            const titles = container.querySelectorAll('p.f_20.fw_700.txc_bk');
            titles.forEach(titleEl => {
                const titleText = titleEl.textContent.trim();
                const listEl = titleEl.nextElementSibling;
                if (listEl && listEl.tagName === 'UL') {
                    const listContent = listEl.querySelector('li')?.innerHTML || '';
                    const items = listContent.split('<br>').map(s => s.trim()).filter(Boolean);
                    if (titleText === '학력') {
                        data.education.push(...items);
                    } else if (titleText === '주요경력') {
                        data.experience.push(...items);
                    } else if (titleText === '주요논문') {
                        data.theses.push(...items);
                    }
                }
            });
            return data;
        });

        synthesizedData.학력 = (mainHistoryData.education || []).map(item => ({ date: null, content: cleanText(item) }));
        synthesizedData.경력 = (mainHistoryData.experience || []).map(item => ({ date: null, content: cleanText(item) }));
        synthesizedData.논문 = (mainHistoryData.theses || []).map(item => cleanText(item));

        await page.click('a[rel="tab2"]');
        await page.waitForSelector('#tab2[style*="block"]');
        const mediaItems = await page.$$eval('#tab2 ul li a', anchors => anchors.map(a => ({ text: a.textContent.trim(), url: a.href })));
        synthesizedData.언론 = mediaItems.map(item => ({ targetDate: null, type: '기사', text: cleanText(item.text), url: item.url, issuer: (item.text.match(/\[(.*?)\]/) || [])[1] || null }));

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