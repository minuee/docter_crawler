const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const jsonFilePath = process.argv[2];
if (!jsonFilePath) {
  console.error('Error: JSON file path is required.');
  process.exit(1);
}

(async () => {
  let browser;
  let originalData;

  try {
    originalData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    const { hospital_site: url, bedoc_doctorname: doctorName } = originalData;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);

    const extractedData = { 학력: [], 경력: [], 학술: [] };

    const profileImg = $("img[alt*=\"${doctorName}\"]");
    if (profileImg.length > 0) {
        extractedData.profileUrl = new URL(profileImg.attr('src'), url).href;
    }

    const specialtyText = $("h3.heading").filter((i, el) => $(el).text().includes(doctorName)).next('p').text().trim();
    if(specialtyText) extractedData.specialty = specialtyText;

    const contentBlock = $("p:has(strong:contains(\"학력\"))");
    if (contentBlock.length > 0) {
        let currentCategory = null;
        contentBlock.contents().each((i, node) => {
            if (node.type === 'tag' && node.name === 'strong') {
                const title = $(node).text().trim();
                if (title.includes('학력')) currentCategory = '학력';
                else if (title.includes('경력')) currentCategory = '경력';
                else if (title.includes('학회활동')) currentCategory = '학술';
            } else if (node.type === 'text') {
                const text = node.data.trim();
                if (text && currentCategory) {
                    extractedData[currentCategory].push({ date: null, content: text });
                }
            }
        });
    }

    const finalData = { ...originalData, ...extractedData, isExist: true, isSearchType: 'html_playwright', error: null };

    fs.writeFileSync(jsonFilePath, JSON.stringify(finalData, null, 2), 'utf-8');
    console.log(`Successfully processed and updated: ${path.basename(jsonFilePath)}`);

  } catch (error) {
    console.error(`Error during playwright execution for ${path.basename(jsonFilePath)}:`, error.message);
    if (originalData) {
        originalData.isSearchType = 'html_playwright_failed';
        originalData.error = error.message;
        fs.writeFileSync(jsonFilePath, JSON.stringify(originalData, null, 2), 'utf-8');
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
