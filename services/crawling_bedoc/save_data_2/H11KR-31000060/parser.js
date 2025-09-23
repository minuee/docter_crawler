const { chromium } = require('playwright');
const fs = require('fs');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const synthesizedData = { 학력: [], 경력: [], 학술: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded' });

        if ((await page.textContent('body')).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = await page.locator('.staff_img img').first().getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        
        const specialtySpans = await page.locator('.staff_info:has-text("전문진료분야") .info_txt span').allInnerTexts();
        synthesizedData.specialty = specialtySpans.map(s => cleanText(s)).join(', ');

        const parseAccordionSection = async (title) => {
            const sectionLi = page.locator('ul.faq_list > li', { has: page.locator('.q_box .tit', { hasText: title }) });
            if (await sectionLi.count() > 0) {
                await sectionLi.locator('.q_box').click();
                await page.waitForTimeout(300);
                const contentPs = await sectionLi.locator('.answer .a_box p').allInnerTexts();
                return contentPs.map(p => ({ date: null, content: cleanText(p) })).filter(p => p.content);
            }
            return [];
        };

        synthesizedData.학력 = await parseAccordionSection('학력');
        synthesizedData.경력 = await parseAccordionSection('경력');
        synthesizedData.학술 = await parseAccordionSection('학회 활동');

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