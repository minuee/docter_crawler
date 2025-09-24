
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    fs.writeFileSync('parser_output.json', JSON.stringify({ error: 'No URL provided' }));
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const doctorData = await page.evaluate(() => {
      const data = {
        profileUrl: null,
        specialty: null,
        학력: [],
        경력: [],
        학술: [],
        isAttend: false,
      };

      const nameElement = document.querySelector('.d_info .name');
      if (nameElement && nameElement.textContent.includes('김신윤')) {
        data.isAttend = true;
      }

      const profileBg = document.querySelector('.section1 .wsize');
      if (profileBg) {
        const style = window.getComputedStyle(profileBg);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const imageUrl = bgImage.match(/url\("?(.+?)"?\)/);
          if (imageUrl && imageUrl[1]) {
            data.profileUrl = new URL(imageUrl[1], 'https://www.daegumc.co.kr').href;
          }
        }
      }

      const specialtyElement = document.querySelector('.d_info .clinic');
      if (specialtyElement) {
        data.specialty = specialtyElement.textContent.replace('전문진료분야', '').trim();
      }

      const experienceDl = Array.from(document.querySelectorAll('.section2 .jsInfo')).find(dl => dl.querySelector('dt').innerText.includes('학력'));
      if (experienceDl) {
        const items = experienceDl.querySelectorAll('dd ul li');
        items.forEach(item => {
          const text = item.textContent.trim();
          if (text.includes('졸업')) {
            data.학력.push({ date: null, content: text });
          } else {
            data.경력.push({ date: null, content: text });
          }
        });
      }

      const academicDl = Array.from(document.querySelectorAll('.section2 .jsInfo')).find(dl => dl.querySelector('dt').innerText.includes('학회'));
      if (academicDl) {
        const items = academicDl.querySelectorAll('dd ul li');
        items.forEach(item => {
          data.학술.push({ date: null, content: item.textContent.trim() });
        });
      }
      
      return data;
    });

    fs.writeFileSync('parser_output.json', JSON.stringify(doctorData, null, 2));

  } catch (error) {
    const errorResult = {
      isSearchType: 'html_playwright_failed',
      error: `Parser failed: ${error.message}`,
    };
    fs.writeFileSync('parser_output.json', JSON.stringify(errorResult, null, 2));
  } finally {
    if (browser) {
      await browser.close();
    }
    fs.writeFileSync('parser_status.txt', 'done');
  }
})();
