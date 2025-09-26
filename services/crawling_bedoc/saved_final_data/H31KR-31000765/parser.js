const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url = process.argv[2];

  await page.goto(url, { waitUntil: 'networkidle' });

  const result = await page.evaluate(() => {
    const data = {
      profileUrl: null,
      specialty: null,
      '학력': [],
      '경력': [],
      '수상': [],
      '학술': [],
      '언론': [],
      '논문': [],
    };

    // Profile URL
    const profileImage = document.querySelector('div[class*="img__"] img');
    if (profileImage) {
      data.profileUrl = new URL(profileImage.getAttribute('src'), window.location.href).href;
    }

    // Helper function to find the container of a title
    const findSectionContainer = (titleText) => {
      const titles = Array.from(document.querySelectorAll('div[class*="button_title__"] p'));
      const titleElement = titles.find(p => p.innerText.trim() === titleText);
      return titleElement ? titleElement.closest('.col') : null;
    };

    // --- Process '약력' Section ---
    const historyContainer = findSectionContainer('약력');
    if (historyContainer) {
        const items = historyContainer.querySelectorAll('div[class*="text_list__"] li p');
        items.forEach(p => {
            const text = p.innerText.trim();
            if (!text) return;

            if (text.includes('졸업') || text.includes('박사') || text.includes('석사') || text.includes('학사')) {
                data['학력'].push({ date: null, content: text });
            } else if (text.includes('수상') || text.includes('등재')) {
                data['수상'].push({ date: null, content: text });
            } else if (text.includes('명의')) {
                data['언론'].push({ targetDate: null, type: '기사', text: text, url: null, issuer: '헬스조선' });
            } else if (text.includes('회원') || text.includes('평의원') || text.includes('위원')) {
                data['학술'].push({ date: null, content: text });
            } else {
                data['경력'].push({ date: null, content: text });
            }
        });
    }

    // --- Process '논문' Section ---
    const paperContainer = findSectionContainer('논문');
    if (paperContainer) {
        const paperItems = paperContainer.querySelectorAll('div[class*="text_list__"] li p');
        paperItems.forEach(p => {
            const text = p.innerText.trim();
            if (text) {
                data['논문'].push(text);
            }
        });
    }

    return data;
  });

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();