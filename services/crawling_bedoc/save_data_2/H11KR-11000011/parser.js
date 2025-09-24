const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Hardcode the output path to avoid argument passing issues
const outputFilePath = '/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/ksw_output.json';

(async () => {
  let result = {};
  const url = process.argv[2];

  if (!url) {
    result = { error: 'URL argument is missing' };
    fs.writeFileSync(outputFilePath, JSON.stringify(result, null, 2));
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.doc_intro_tx', { timeout: 20000 });

    const doctorData = await page.evaluate(() => {
      const data = { 학력: [], 경력: [] };
      const getFullUrl = (relPath) => new URL(relPath, window.location.href).href;

      const profileImg = document.querySelector('.doc_img img');
      if (profileImg) {
        data.profileUrl = getFullUrl(profileImg.src);
      }

      const specialtyElement = Array.from(document.querySelectorAll('dl.doc_profile dt')).find(dt => dt.textContent.trim() === '진료분야');
      if (specialtyElement && specialtyElement.nextElementSibling) {
        data.specialty = specialtyElement.nextElementSibling.textContent.trim();
      }

      const sections = document.querySelectorAll('.doc_info_wp .sub_tit');
      sections.forEach(section => {
        const title = section.textContent.trim();
        const list = section.nextElementSibling;
        if (list && list.tagName === 'UL') {
          const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
          if (title === '학력') {
            items.forEach(item => data.학력.push({ content: item }));
          } else if (title === '경력') {
            items.forEach(item => data.경력.push({ content: item }));
          }
        }
      });

      return data;
    });

    result = doctorData;

  } catch (error) {
    result = { error: error.message, isSearchType: 'html_playwright_failed' };
  } finally {
    await browser.close();
    fs.writeFileSync(outputFilePath, JSON.stringify(result, null, 2));
  }
})();