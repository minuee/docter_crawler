const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { profileUrl: null, specialty: '', 학력: [], 경력: [], 논문: [], 언론: [], 학술: [] };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });
        const content = await page.content();
        const $ = cheerio.load(content);

        if ($('body').text().includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        // Profile Image
        const imgSrc = $('div.doctorPhoto > img').attr('src');
        if (imgSrc) {
            synthesizedData.profileUrl = new URL(imgSrc, doctorData.hospital_site).href;
        }
        
        // Specialty
        synthesizedData.specialty = cleanText($("dt:contains('전문진료분야')").next('dd').text());

        // Education
        $('section.eduSpec li:has(div.title:contains("학력")) p').each((i, el) => {
            const itemText = cleanText($(el).text());
            if (itemText) synthesizedData.학력.push({ date: null, content: itemText });
        });

        // Experience
        $('section.eduSpec li:has(div.title:contains("주요경력")) p').each((i, el) => {
            const itemText = cleanText($(el).text());
            if (itemText) synthesizedData.경력.push({ date: null, content: itemText });
        });

        // Papers
        $('section.paperSpec li:has(div.title:contains("논문")) p').each((i, el) => {
            const itemText = cleanText($(el).text());
            if (itemText) synthesizedData.논문.push(itemText);
        });

        // Media
        $('section.paperSpec li:has(div.title:contains("언론보도")) p').each((i, el) => {
            const itemText = cleanText($(el).text());
            if (itemText) {
                const link = $(el).find('a').attr('href') || null;
                synthesizedData.언론.push({ targetDate: null, type: '기사', text: itemText, url: link, issuer: null });
            }
        });
        
        // Academic / Presentations
        $('section.paperSpec li:has(div.title:contains("발표")) p').each((i, el) => {
            const itemText = cleanText($(el).text());
            if (itemText) synthesizedData.학술.push({ date: null, content: itemText });
        });

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        isAttend = false;
    } finally {
        await browser.close();
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    
    Object.keys(finalResult).forEach(key => {
        if ((Array.isArray(finalResult[key]) && finalResult[key].length === 0) || finalResult[key] === '' || finalResult[key] === null) {
           delete finalResult[key];
        }
    });

    return finalResult;
}

if (require.main === module) {
    const doctorFilePath = process.argv[2];
    if (!doctorFilePath) {
        console.error('Usage: node parser.js <path_to_doctor_json_file>');
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            let updatedDoctorData = { ...doctorData, ...result };

            updatedDoctorData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedDoctorData.isExist = !result.error;
            updatedDoctorData.isAttend = result.isAttend;
            updatedDoctorData.error = result.error || null;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}