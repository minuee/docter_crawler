const { chromium } = require('playwright');

const [,, url] = process.argv;

if (!url) {
  console.error('Error: URL argument is missing.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Click the 'more' button for theses until it is no longer visible
    while (await page.locator('a.thesisBtn:visible').count() > 0) {
      await page.locator('a.thesisBtn:visible').click();
      // Wait for new content to load. A fixed wait is not ideal, but this site is simple.
      await page.waitForTimeout(500);
    }

    const extractedData = await page.evaluate(() => {
      const data = {
        profileUrl: null,
        specialty: null,
        학력: [],
        경력: [],
        논문: [],
      };

      // Profile URL
      const profileImg = document.querySelector('.profile_topImg img');
      if (profileImg) {
        data.profileUrl = profileImg.src;
      }

      // Specialty
      const specialtyDd = document.querySelector('dl.special dd');
      if (specialtyDd) {
        data.specialty = specialtyDd.innerText.trim();
      }

      // Experience (combining multiple sections)
      const experienceSelectors = [
        '#ctl00_ContentPlaceHolder1_ul1 li', // 교수 경력
        '#ctl00_ContentPlaceHolder1_ul6 li', // 진료 경력
        '#ctl00_ContentPlaceHolder1_ul2 li', // 학회/연구
      ];

      experienceSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(li => {
          const text = li.innerText.trim();
          if (text) {
            data.경력.push({ date: null, content: text });
          }
        });
      });

      // Papers (now that all are loaded)
      document.querySelectorAll('ol.thesisList li').forEach(li => {
          const text = li.innerText.replace(/\s+/g, ' ').trim();
          if(text) {
              data.논문.push(text);
          }
      });

      return data;
    });

    console.log(JSON.stringify(extractedData, null, 2));

  } catch (error) {
    console.error(`Error during playwright execution: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();