
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

    const synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], specialty: null, profileUrl: null };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const bodyText = await page.textContent('body');
        if (bodyText.includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // 1. 프로필 이미지
        synthesizedData.profileUrl = await page.$eval('.doctor-detail-photo img', img => new URL(img.src, page.url()).href).catch(() => null);

        // 2. 진료분야
        synthesizedData.specialty = cleanText(await page.$eval('.doctor-detail-part dd', el => el.textContent));

        // 3. 약력 (학력/경력 분리)
        const careerItems = await page.$$eval('#tab-career ul li', lis => lis.map(li => li.textContent.trim()));
        careerItems.forEach(item => {
            const cleanItem = cleanText(item);
            if (cleanItem.includes('박사') || cleanItem.includes('석사') || cleanItem.includes('학사')) {
                synthesizedData.학력.push({ date: null, content: cleanItem });
            } else {
                synthesizedData.경력.push({ date: null, content: cleanItem });
            }
        });

        // 4. 논문 & 저서
        const thesisAndBooks = await page.evaluate(() => {
            const container = document.querySelector('#tab-thesis');
            if (!container) return { theses: [], books: [] };

            const allNodes = Array.from(container.childNodes);
            const theses = [];
            const books = [];
            let currentSection = '';

            allNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === 'P') {
                        const strongText = node.querySelector('strong')?.textContent || '';
                        if (strongText.includes('주요논문')) {
                            currentSection = 'thesis';
                        } else if (strongText.includes('저서')) {
                            currentSection = 'book';
                        }
                    } else if (node.tagName === 'UL') {
                        const items = Array.from(node.querySelectorAll('li')).map(li => li.textContent.trim());
                        if (currentSection === 'thesis') {
                            theses.push(...items);
                        } else if (currentSection === 'book') {
                            books.push(...items);
                        }
                    }
                }
            });
            return { theses, books };
        });

        synthesizedData.논문 = thesisAndBooks.theses.map(item => cleanText(item));
        synthesizedData.저서 = thesisAndBooks.books.map(item => ({ date: null, content: cleanText(item) }));

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
