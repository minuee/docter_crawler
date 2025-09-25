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
        await page.goto(doctorData.hospital_site, { waitUntil: 'load', timeout: 60000 });

        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        const $ = cheerio.load(bodyHtml);

        const $container = $('.view_dr2_right');

        if ($container.text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        synthesizedData.profileUrl = new URL($('.view_dr2_left img').attr('src'), doctorData.hospital_site).href;

        const parseSection = (title) => {
            const items = [];
            $container.find(`div:contains('${title}')`).next().find('div').each((i, el) => {
                const text = cleanText($(el).text());
                if (text) {
                    items.push({ date: null, content: text });
                }
            });
            return items;
        };

        let specialty = [];
        $container.find('div:contains("진료과목")').next().find('div').each((i, el) => {
            specialty.push(cleanText($(el).text()));
        });
        $container.find('div:contains("세부진료과목")').next().find('div').each((i, el) => {
            specialty.push(cleanText($(el).text()));
        });
        synthesizedData.specialty = specialty.join(', ');


        synthesizedData.학력 = parseSection('학력');
        synthesizedData.경력 = parseSection('주요경력');
        synthesizedData.수상 = parseSection('수상내역');

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