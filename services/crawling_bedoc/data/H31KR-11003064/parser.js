
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
    const synthesizedData = { 학력: [], 경력: [], 학술: [], specialty: null, isAttend: false, profileUrl: null };

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded' });
        // Wait for the specific doctor image to be loaded, as the content is dynamic
        await page.waitForSelector(`img[alt*="${doctor_name}"]`, { timeout: 15000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        // Find the doctor's image element by alt text to get the data-doctor ID
        const doctorImage = $(`img[alt*="${doctor_name}"]`);
        if (doctorImage.length === 0) {
            throw new Error(`Doctor ${doctor_name} not found on the page.`);
        }

        synthesizedData.isAttend = true;
        synthesizedData.profileUrl = new URL(doctorImage.attr('src'), hospital_site).href;

        const doctorId = doctorImage.closest('.ke-list-item').find('.btn-doctor').data('doctor');
        if (!doctorId) {
            throw new Error(`Could not find data-doctor ID for ${doctor_name}.`);
        }

        // Find the corresponding hidden layer with the data-doctor ID
        const doctorLayer = $(`.doctor-layer[data-doctor="${doctorId}"]`);

        const extractSection = (header) => {
            const items = [];
            doctorLayer.find(`h4:contains('${header}')`).next('p').html().split('<br>').forEach(item => {
                const cleanItem = item.trim();
                if (cleanItem) {
                    items.push({ date: null, content: cleanItem.replace(/"/g, '') });
                }
            });
            return items;
        };

        synthesizedData.학력 = extractSection('학력');
        synthesizedData.경력 = extractSection('경력');
        synthesizedData.학술 = extractSection('학회');
        
        // Specialty is not explicitly labeled, but can be inferred or is missing.
        // In this case, we leave it as null since there is no clear specialty field.

        // Update original data
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
