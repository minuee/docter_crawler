const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * Implements Phase 1 of the parsing workflow.
 * It attempts to parse doctor info from the hospital website and saves the state to a single JSON file.
 */
async function parseWithGemini(doctorData) {
    const { bedoc_doctorname, aiga_hid,hospital_addr } = doctorData;
    const dataDir = path.join(__dirname, 'data', aiga_hid);
    // Ensure the directory exists before writing the file
    fs.mkdirSync(dataDir, { recursive: true });
    const jsonFilePath = path.join(dataDir, `${bedoc_doctorname}.json`);

    // If a file already exists and is fully processed, skip.
    if (fs.existsSync(jsonFilePath)) {
        const existingData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
        if (existingData.isExist === true || existingData.isExist === false) {
            console.log(`[On-Site] Skipping ${bedoc_doctorname} as it is already processed.`);
            return { success: true, data: existingData };
        }
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle2', timeout: 20000 });

        let htmlContent = await page.content();
        if (!htmlContent.includes(bedoc_doctorname)) {
            console.log(`[On-Site] Doctor not on initial page. Searching for staff link for ${bedoc_doctorname}...`);
            const staffLinkSelectors = ['a:contains("의료진")', 'a:contains("의사소개")', 'a:contains("진료과")'];
            const staffLinkHandle = await Promise.any(staffLinkSelectors.map(selector => page.waitForSelector(selector, { timeout: 3000 }))).catch(() => null);

            if (!staffLinkHandle) throw new Error('Could not find medical staff link.');
            
            await Promise.all([ page.waitForNavigation({timeout: 10000}).catch(()=>{}), staffLinkHandle.click() ]);
            console.log(`[On-Site] Navigated to staff page for ${bedoc_doctorname}.`);

            const doctorLinkHandle = await page.waitForSelector(`a:contains("${bedoc_doctorname}")`, { timeout: 5000 }).catch(() => null);
            if (!doctorLinkHandle) throw new Error(`Could not find link for doctor ${bedoc_doctorname} on staff page.`);

            await Promise.all([ page.waitForNavigation({timeout: 10000}).catch(()=>{}), doctorLinkHandle.click() ]);
        }

        console.log(`[On-Site] Parsing final page content for ${bedoc_doctorname}.`);
        htmlContent = await page.content();
        const finalUrl = page.url();

        const $ = cheerio.load(htmlContent);
        const education = [];
        const experience = [];
        let profileUrl = null;

        // Find profile image
        $(`img[alt*="${bedoc_doctorname}"], img[src*="${bedoc_doctorname}"]`).each((i, el) => {
            if (!profileUrl) profileUrl = $(el).attr('src');
        });

        // Find education/experience
        $('h1, h2, h3, h4, strong, b').each((i, el) => {
            const title = $(el).text().replace(/\s+/g, '');
            if (title.includes('학력')) {
                $(el).nextAll('ul, p').first().find('li, p').each((j, item) => education.push({ content: $(item).text().trim() }));
            }
            if (title.includes('경력')) {
                $(el).nextAll('ul, p').first().find('li, p').each((j, item) => experience.push({ content: $(item).text().trim() }));
            }
        });

        if (education.length === 0 && experience.length === 0) {
            throw new Error('Cheerio parser could not extract education or experience.');
        }

        const parsedData = { ...doctorData, isExist: true, isSearchType: 'html', doctorSiteUrl: finalUrl, profileUrl, education, experience, thesis: [] };
        fs.writeFileSync(jsonFilePath, JSON.stringify(parsedData, null, 2));
        console.log(`[On-Site] Success for ${bedoc_doctorname}.`);
        return { success: true, data: parsedData };

    } catch (error) {
        console.log(`[On-Site] Failed for ${bedoc_doctorname}: ${error.message}.`);
        const failedData = { ...doctorData, isExist: null, isSearchType: 'html_failed', error: error.message };
        fs.writeFileSync(jsonFilePath, JSON.stringify(failedData, null, 2));
        return { success: false, data: failedData };
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }
}

module.exports = { parseWithGemini };