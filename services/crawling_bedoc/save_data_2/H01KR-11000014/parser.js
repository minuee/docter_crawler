const playwright = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio'); // Assuming cheerio is available for HTML parsing

// Function to parse command line arguments
const parseArgs = () => {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        const [key, value] = arg.split('=');
        if (key.startsWith('--')) {
            args[key.substring(2)] = value;
        }
    });
    return args;
};

const args = parseArgs();

const doctorName = args.doctorName;
const deptName = args.deptName;
const hospitalSite = args.hospitalSite;
const siteType = args.siteType;
const filePath = args.filePath; // Path to the doctor's JSON file

if (!doctorName || !hospitalSite || !filePath) {
    console.error('Error: Missing required arguments (doctorName, hospitalSite, filePath).');
    process.exit(1);
}

// Function to remove double quotes from a string
function removeDoubleQuotes(text) {
    return text ? text.replace(/"/g, '') : text;
}

async function parseDoctorData() {
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let doctorData = {};
    try {
        // Load existing data if available
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            doctorData = JSON.parse(rawData);
        }

        console.log(`Navigating to ${hospitalSite}`);
        await page.goto(hospitalSite, { waitUntil: 'networkidle', timeout: 120000 }); // Increased timeout to 120 seconds

        // Scroll to the bottom to trigger lazy loading
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000); // Wait for content to load after scroll

        let targetHtml = '';

        if (siteType === 'single') {
            targetHtml = await page.content();
        } else if (siteType === 'list' || siteType === 'popup') {
            // As per the guide, these need custom implementation.
            // For now, we'll mark them as failed if encountered.
            doctorData.error = `Site type '${siteType}' not fully implemented in parser.js for this hospital.`;
            doctorData.isSearchType = "html_playwright_failed";
            fs.writeFileSync(filePath, JSON.stringify(doctorData, null, 2), 'utf-8');
            await browser.close();
            return;
        }

        // Sanitize HTML
        let sanitizedHtml = targetHtml
            .replace(/<script\b[^<]*(?:(?!<\/script>)[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)[^<]*)*<\/style>/gi, '')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)[^<]*)*<\/nav>/gi, '');

        

        // Use cheerio for robust HTML parsing
        const $ = cheerio.load(sanitizedHtml);

        const synthesizedData = {};

        // --- Extraction Logic for 한양대학교병원 (H01KR-11000014) ---
        // Based on the hospital_site: https://seoul.hyumc.com/seoul/mediteam/mditeam.do?action=detail...
        // This is a dynamic page, so direct CSS selectors might be needed.

        // Example selectors (these might need adjustment after inspecting the actual page)
        // Profile Image
        const profileImgSrc = $('.doc_photo img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, hospitalSite).href;
        }

        // Specialty
        const specialtyElement = $('.doc_info .major_txt');
        if (specialtyElement.length) {
            synthesizedData.specialty = removeDoubleQuotes(specialtyElement.text().trim());
        }

        // Education (학력) and Experience (경력)
        // Assuming a common structure like a list of items for career/education
        const careerItems = $('.career_list li');
        const educationList = [];
        const experienceList = [];

        careerItems.each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('학사') || text.includes('석사') || text.includes('박사') || text.includes('졸업')) {
                educationList.push({ date: null, content: removeDoubleQuotes(text) });
            } else {
                experienceList.push({ date: null, content: removeDoubleQuotes(text) });
            }
        });

        if (educationList.length > 0) {
            synthesizedData['학력'] = educationList;
        }
        if (experienceList.length > 0) {
            synthesizedData['경력'] = experienceList;
        }

        // Awards (수상), Academic (학술), Media (언론), Books (저서), Papers (논문)
        // These will require specific selectors based on the actual page structure.
        // For now, leaving them as placeholders.
        // Example:
        // const awards = [];
        // $('.awards_section li').each((i, el) => {
        //     awards.push({ date: null, content: removeDoubleQuotes($(el).text().trim()) });
        // });
        // if (awards.length > 0) {
        //     synthesizedData['수상'] = awards;
        // }


        // Check doctor attendance (isAttend)
        const pageText = $('body').text();
        synthesizedData.isAttend = pageText.includes(doctorName);

        // Merge and save data
        const mergedData = { ...doctorData, ...synthesizedData };
        mergedData.isExist = Object.keys(synthesizedData).length > 0;
        mergedData.isSearchType = mergedData.isExist ? 'html_playwright' : 'html_playwright_failed';
        mergedData.error = mergedData.isExist ? null : "No new data extracted after Playwright attempt.";

        fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');
        console.log(`Successfully processed and updated data for ${doctorName}.`);

    } catch (error) {
        console.error(`Error processing ${doctorName}:`, error);
        doctorData.error = `Playwright execution failed: ${error.message}`;
        doctorData.isSearchType = 'html_playwright_failed';
        fs.writeFileSync(filePath, JSON.stringify(doctorData, null, 2), 'utf-8');
    } finally {
        await browser.close();
    }
}

parseDoctorData();