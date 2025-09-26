
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const doctorData = JSON.parse(process.argv[2]);
  const { hospital_site: url, bedoc_doctorname: doctorName, aiga_hid } = doctorData;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    const data = await page.evaluate(() => {
      const extractedData = {
        "학력": [],
        "경력": [],
        "학술": [],
        profileUrl: null,
        specialty: null,
      };

      // 프로필 이미지
      const profileImg = document.querySelector('#doctor2 .imgWrap img');
      if (profileImg) {
        extractedData.profileUrl = new URL(profileImg.getAttribute('src'), location.href).href;
      }
      
      // 진료분야 (고정값)
      const specialtyEl = document.querySelector('#doctorTitle h3');
      if (specialtyEl && specialtyEl.textContent.includes('신경과 전문의')) {
        extractedData.specialty = '신경과';
      }

      // 학력, 경력, 학회활동
      const sections = document.querySelectorAll('#doctor2 .contWrap ul');
      sections.forEach(section => {
        const titleEl = section.querySelector('h3');
        if (!titleEl) return;

        const title = titleEl.textContent.trim();
        const items = Array.from(section.querySelectorAll('li p')).map(p => p.textContent.trim());

        if (title === '학력') {
          items.forEach(item => {
            extractedData["학력"].push({ date: null, content: item });
          });
        } else if (title === '경력' || title === '해외연수') {
          items.forEach(item => {
            extractedData["경력"].push({ date: null, content: item });
          });
        } else if (title === '학회 활동') {
          items.forEach(item => {
            extractedData["학술"].push({ date: null, content: item });
          });
        }
      });

      return extractedData;
    });

    console.log(JSON.stringify(data));

  } catch (e) {
    console.error(JSON.stringify({ error: `Error in parser.js: ${e.message}` }));
  } finally {
    await browser.close();
  }
})();
