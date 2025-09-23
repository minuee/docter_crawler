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

    // Find the button for the specific doctor and click it
    const doctorButton = page.locator(`li:has-text("${doctorName}") > a[class^="docter-btn"]`);
    if (await doctorButton.count() === 0) {
        throw new Error(`Could not find button for doctor ${doctorName}`);
    }
    await doctorButton.click();

    // Wait for the modal to become active
    const modalSelector = 'ul.prf.active';
    await page.waitForSelector(modalSelector, { state: 'visible', timeout: 10000 });

    const htmlContent = await page.innerHTML(modalSelector);
    const $ = cheerio.load(htmlContent);

    const extractedData = { 학력: [], 경력: [] };

    const bgImage = $("li[style*=\"background-image\"]").attr("style");
    const urlMatch = bgImage.match(/url\(([^)]+)\)/);
    if (urlMatch && urlMatch[1]) {
        extractedData.profileUrl = new URL(urlMatch[1].replace(/['"]/g, ''), url).href;
    }

    extractedData.specialty = $(".txt.mb70").text().replace('전문진료과목','').trim();

    $(".txt-box > ul > li").each((i, el) => {
        const text = $(el).text().trim().replace(/^ㆍ\s*/, '');
        if (!text || text.includes('약력 및 경력')) return;

        if (text.includes('졸업') || text.includes('석사') || text.includes('박사')) {
            extractedData.학력.push({ date: null, content: text });
        } else {
            extractedData.경력.push({ date: null, content: text });
        }
    });
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
