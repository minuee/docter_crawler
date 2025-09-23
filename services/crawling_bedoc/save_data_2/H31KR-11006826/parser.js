
const { chromium } = require('playwright');

(async () => {
  const doctorData = JSON.parse(process.argv[2]);
  const { hospital_site: url, bedoc_doctorname: doctorName } = doctorData;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    const data = await page.evaluate((drName) => {
      const extractedData = {
        "학력": [],
        "경력": [],
        "수상": [],
        profileUrl: null,
        specialty: null, // specialty is not available on this page
      };

      const doctorSections = document.querySelectorAll('.content-row');
      let targetSection = null;

      doctorSections.forEach(section => {
        const nameEl = section.querySelector('.profile-area .name');
        if (nameEl && nameEl.textContent.includes(drName)) {
          targetSection = section;
        }
      });

      if (targetSection) {
        // 프로필 이미지
        const profileImg = targetSection.querySelector('.thumb-box img');
        if (profileImg) {
          extractedData.profileUrl = new URL(profileImg.getAttribute('src'), location.href).href;
        }

        // 학력, 경력, 수상
        const detailRows = targetSection.querySelectorAll('.detail-row');
        detailRows.forEach(row => {
          const titleEl = row.querySelector('.title');
          if (!titleEl) return;

          const title = titleEl.textContent.trim().replace(/\s|\u00a0/g, ' ');
          const items = Array.from(row.querySelectorAll('.detail-list li p')).map(p => p.textContent.trim().replace(/\s+/g, ' '));

          if (title === '학력') {
            items.forEach(item => {
              extractedData["학력"].push({ date: null, content: item });
            });
          } else if (title === '주요 경력') {
            items.forEach(item => {
              extractedData["경력"].push({ date: null, content: item });
            });
          } else if (title === '수상 경력') {
            items.forEach(item => {
              extractedData["수상"].push({ date: null, content: item });
            });
          }
        });
      }

      return extractedData;
    }, doctorName);

    console.log(JSON.stringify(data));

  } catch (e) {
    console.error(JSON.stringify({ error: `Error in parser.js: ${e.message}` }));
  } finally {
    await browser.close();
  }
})();
