const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').replace(/\*/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], 언론: [], 수상: [], 학술: [] };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const bodyHtml = await page.content();
        const $ = cheerio.load(bodyHtml);

        const $container = $('.doctor_view');

        if ($container.text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = new URL($container.find('.doctor_img img').attr('src'), doctorData.hospital_site).href;
        synthesizedData.specialty = cleanText($container.find('.field').text().replace('진료분야', ''));

        const historyList = $container.find('.history_list');

        historyList.find('dl').each((i, dl) => {
            const dt = $(dl).find('dt').text().trim();
            const dd = $(dl).find('dd');

            if (dt === '교육 및 임상경력') {
                const items = dd.find('li').html().split('<br>').map(item => cleanText(item));
                items.forEach(item => {
                    if (item.includes('졸업') || item.includes('레지던트') || item.includes('인턴')) {
                        if(item) synthesizedData.학력.push({ date: null, content: item });
                    } else {
                        if(item) synthesizedData.경력.push({ date: null, content: item });
                    }
                });
            } else if (dt === '전문 경력') {
                const items = dd.find('li').html().split('<br>').map(item => cleanText(item));
                items.forEach(item => {
                    if (item.includes('수상')) {
                        if(item) synthesizedData.수상.push({ date: null, content: item });
                    } else {
                        if(item) synthesizedData.학술.push({ date: null, content: item });
                    }
                });
            }
        });

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
    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };

            if (result.error) {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
            } else {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
            }
            updatedDoctorData.isAttend = result.isAttend;
            if(result.error) {
                updatedDoctorData.error = result.error;
            } else {
                delete updatedDoctorData.error;
            }

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
