const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const outputFilePath = 'parser_output.json';
  const screenshotPath = 'debug_screenshot.png';

  try {
    const url = process.argv[2];
    if (!url) {
      fs.writeFileSync(outputFilePath, JSON.stringify({ error: 'Usage: node parser.js <url>' }));
      process.exit(1);
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for a few seconds to let JS load content
    await page.waitForTimeout(5000);

    await page.screenshot({ path: screenshotPath, fullPage: true });

    const data = await page.evaluate(() => {
      const getListWithDate = (selector) => {
          return Array.from(document.querySelectorAll(selector)).map(el => ({
              date: null,
              content: el.innerText.trim()
          }));
      };

      const getList = (selector) => {
          return Array.from(document.querySelectorAll(selector)).map(el => el.innerText.trim());
      };

      const profileUrl = document.querySelector('.x_docDetail_img .swiper-slide:not(.swiper-slide-duplicate) img')?.getAttribute('src') || null;
      const specialty = getList('.docDetail_dept .x_txtList li').join(', ');
      
      const education = getListWithDate('#eduArea .x_doc_detailList li p span');
      const experience = getListWithDate('#careerArea .x_doc_detailList li p span');
      const academic = getListWithDate('#academyArea .x_doc_detailList li p span');
      const papers = getList('#paperArea .x_doc_detailList li p span').filter(p => p && p.trim());

      return {
        profileUrl: profileUrl ? new URL(profileUrl, "https://www.andonghospital.co.kr/").href : null,
        specialty,
        '학력': education,
        '경력': experience,
        '학술': academic,
        '논문': papers,
      };
    });

    fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2));
    await browser.close();

  } catch (error) {
    fs.writeFileSync(outputFilePath, JSON.stringify({ error: error.message }));
    process.exit(1);
  }
})();