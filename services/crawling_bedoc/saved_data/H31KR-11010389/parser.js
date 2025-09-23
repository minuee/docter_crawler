
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

    const extractedData = {};
    let doctorDiv = null;

    $('div.fset').each((i, el) => {
      const p_element = $(el).find('p');
      if (p_element.html() && p_element.html().includes(`<b>${doctorName} 원장</b>`)) {
        doctorDiv = el;
        return false;
      }
    });

    if (doctorDiv) {
      const $doc = $(doctorDiv);
      extractedData.profileUrl = new URL($doc.find('img').attr('src'), url).href;

      const p_html = $doc.find('p').html().replace(/<br\s*\/?>/ig, '|||');
      const fullText = cheerio.load(p_html).text();
      const lines = fullText.split('|||').map(line => line.trim());

      const sections = [];
      let currentSection = [];

      lines.forEach(line => {
        if (line === '' || line.includes('원장')) {
          if (currentSection.length > 0) {
            sections.push(currentSection);
          }
          currentSection = [];
        } else {
          currentSection.push(line);
        }
      });
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }

      if (sections.length > 0) extractedData.specialty = sections[0].join(', ');
      if (sections.length > 1) extractedData.학력 = sections[1].map(content => ({ date: null, content }));
      if (sections.length > 2) extractedData.경력 = sections[2].map(content => ({ date: null, content }));
      if (sections.length > 3) extractedData.학술 = sections[3].map(content => ({ date: null, content }));
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
