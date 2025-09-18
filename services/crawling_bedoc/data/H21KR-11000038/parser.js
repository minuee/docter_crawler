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

        synthesizedData.profileUrl = await page.locator('.intro_view .img img').getAttribute('src').then(src => new URL(src, page.url()).href).catch(() => null);
        
        const specialtyText = await page.locator('.intro_view > div[style*="float:left"] > p').last().innerHTML();
        synthesizedData.specialty = specialtyText.split('<br>').map(s => cleanText(s.replace('진료분야 :', ''))).filter(Boolean).join(', ');

        const mainList = page.locator('.intro_view .list');

        const educationAndExperience = await mainList.locator('h5:has-text("학력 및 임상 경력") + ul > li').allInnerTexts();
        educationAndExperience.forEach(item => {
            const cleanItem = cleanText(item);
            if (cleanItem.includes('졸업') || cleanItem.includes('석사') || cleanItem.includes('박사')) {
                synthesizedData.학력.push({ date: null, content: cleanItem });
            } else {
                synthesizedData.경력.push({ date: null, content: cleanItem });
            }
        });

        const academicActivities = await mainList.locator('h5:has-text("학회 및 기타활동") + ul > li').allInnerTexts();
        synthesizedData.학술 = academicActivities.map(item => ({ date: null, content: cleanText(item) }));

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