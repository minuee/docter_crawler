const { chromium } = require('playwright');

(async () => {
  const timeout = 2 * 60 * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const url = process.argv[2];
    const doctorName = process.argv[3];

    if (!url || !doctorName) {
      console.error('Please provide a URL and a doctor name.');
      process.exit(1);
    }

    await page.goto(url, { waitUntil: 'networkidle' });

    const doctorContainer = page.locator(`.doctors_list:has-text("${doctorName}")`);
    await doctorContainer.waitFor({ state: 'visible', timeout: 10000 });

    const detailButton = doctorContainer.locator('a.ez-layer-btn');
    await detailButton.click();

    const popupId = await detailButton.getAttribute('href');
    const popup = page.locator(popupId);
    await popup.waitFor({ state: 'visible', timeout: 10000 });

    const doctorData = await popup.evaluate(popupNode => {
      const data = {};
      const baseUrl = document.location.origin;

      const profileImg = popupNode.querySelector('.profile .left img');
      if (profileImg) {
        data.profileUrl = new URL(profileImg.src, baseUrl).href;
      }

      const sections = {
        '학력': [],
        '경력': [],
        '학술': [],
        '진료분야': null
      };

      popupNode.querySelectorAll('.profile_title').forEach(titleEl => {
        const titleText = titleEl.innerText.trim();
        const contentEl = titleEl.nextElementSibling;

        if (contentEl && contentEl.classList.contains('profile_detail')) {
          const content = contentEl.innerHTML.split(/<br\s*\/?>/i).map(item => item.trim()).filter(Boolean);
          
          if (titleText.includes('진료분야')) {
            sections['진료분야'] = content.join(', ');
          } else if (titleText.includes('학력')) {
            sections['학력'].push(...content.map(item => ({ date: null, content: item })));
          } else if (titleText.includes('경력') || titleText.includes('활동')) {
            sections['경력'].push(...content.map(item => ({ date: null, content: item })));
          } else if (titleText.includes('학회')) {
            sections['학술'].push(...content.map(item => ({ date: null, content: item })));
          }
        }
      });

      data.specialty = sections['진료분야'];
      data.학력 = sections['학력'];
      data.경력 = sections['경력'];
      data.학술 = sections['학술'];
      data.수상 = [];
      data.논문 = [];

      return data;
    });

    console.log(JSON.stringify(doctorData, null, 2));

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Script timed out after 2 minutes.');
    } else {
      console.error('An error occurred:', error.message);
    }
    console.log(JSON.stringify({}, null, 2));
  } finally {
    clearTimeout(timer);
    await browser.close();
  }
})();