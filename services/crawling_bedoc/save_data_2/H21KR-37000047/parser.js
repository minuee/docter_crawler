
const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

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
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const synthesizedData = { 학력: [], 경력: [], specialty: null, isAttend: false, profileUrl: null };

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const $ = cheerio.load(html);

        const doctorContainer = $('.per_wrap').filter((i, el) => {
            return $(el).find('.p_name').text().trim().includes(doctor_name);
        });

        if (doctorContainer.length === 0) {
            throw new Error(`Doctor ${doctor_name} not found on the page.`);
        }

        synthesizedData.isAttend = true;

        const profileImgSrc = doctorContainer.find('.per_img img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        doctorContainer.find('.p_row').each((i, row) => {
            const th = $(row).find('.p_th').text().trim();
            const td = $(row).find('.p_td');

            if (th === '진료분야') {
                synthesizedData.specialty = td.text().trim().replace(/\s+/g, ' ');
            } else if (th === '약력') {
                td.find('p').each((j, p) => {
                    const content = $(p).text().trim();
                    if (!content) return;

                    if (content.includes('졸업')) {
                        synthesizedData.학력.push({ date: null, content: content.replace(/"/g, '') });
                    } else {
                        synthesizedData.경력.push({ date: null, content: content.replace(/"/g, '') });
                    }
                });
            }
        });

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
