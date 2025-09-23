
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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

    const buttonXPath = `//span[contains(text(), "${doctorName}")]/ancestor::tr/following-sibling::tr[1]//input[@value="의료진 소개"]`;
    const detailButton = page.locator(buttonXPath);

    if (await detailButton.count() === 0) {
      throw new Error(`Could not find the details button for doctor ${doctorName}.`);
    }

    await detailButton.click();

    const popupSelector = '.doc_pop_wrap';
    await page.waitForSelector(popupSelector, { state: 'visible', timeout: 10000 });

    const extractedData = await page.evaluate((popupSel) => {
      const popup = document.querySelector(popupSel);
      if (!popup) return {};

      const data = {};

      const getTextById = (id) => popup.querySelector(`#${id}`)?.innerText.trim() || null;
      const getHtmlById = (id) => popup.querySelector(`#${id}`)?.innerHTML || '';

      const splitBr = (html) => html.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);

      data.profileUrl = popup.querySelector('#pop_drimg')?.src || null;
      data.specialty = getTextById('pop_drmajor');

      data.학력 = splitBr(getHtmlById('pop_drtxt1')).map(content => ({ date: null, content }));
      data.경력 = splitBr(getHtmlById('pop_drtxt2')).map(content => ({ date: null, content }));
      data.학술 = splitBr(getHtmlById('pop_drtxt3')).map(content => ({ date: null, content }));
      data.수상 = splitBr(getHtmlById('pop_drtxt4')).map(content => ({ date: null, content }));
      data.논문 = splitBr(getHtmlById('pop_drtxt5'));

      data.언론 = Array.from(popup.querySelectorAll('.doc_pop_con_wrap.c3 .news')).map(el => {
        const onclickAttr = el.getAttribute('onclick');
        const urlMatch = onclickAttr ? onclickAttr.match(/window\.open\('(.*?)'\)/) : null;
        const url = urlMatch ? urlMatch[1] : null;
        const textContent = el.innerText.trim();
        const dateMatch = textContent.match(/^(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : null;
        const text = date ? textContent.replace(date, '').trim() : textContent;

        return { targetDate: date, type: '기사', text, url, issuer: null };
      });

      // Remove empty arrays
      for (const key in data) {
        if (Array.isArray(data[key]) && data[key].length === 0) {
          delete data[key];
        }
      }

      return data;
    }, popupSelector);

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
