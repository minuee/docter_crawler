const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as a command-line argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const doctorData = await page.evaluate((pageUrl) => {
    const data = {
      학력: [],
      경력: [],
      수상: [],
      학술: [],
      specialty: null,
      profileUrl: null,
    };

    // Profile URL
    const profileImg = document.querySelector('.doctor_img img');
    if (profileImg && profileImg.src) {
      data.profileUrl = new URL(profileImg.src, pageUrl).href;
    }

    // All biography items are in one block
    const careerItems = document.querySelectorAll('.doctor_career div');
    
    careerItems.forEach((item, index) => {
      const text = item.textContent.trim();
      if (!text) return;

      // First item is specialty
      if (index === 0) {
          data.specialty = text;
          return; // Continue to next item
      }

      // Categorize based on keywords
      if (text.includes('졸업') || text.includes('박사')) {
        data.학력.push({ date: null, content: text });
      } else if (text.includes('훈장') || text.includes('대상') || text.includes('학술상')) {
        // Handle multiple awards on one line
        const awards = text.split('/').map(s => s.trim()).filter(Boolean);
        awards.forEach(award => {
            const yearMatch = award.match(/^(\d{4})/);
            const date = yearMatch ? yearMatch[1] : null;
            const content = award.replace(/^(\d{4})\s*/, '').trim();
            data.수상.push({ date: date, content: content });
        });
      } else if (text.includes('학회') || text.includes('위원') || text.includes('이사') || text.includes('소장') || text.includes('지회장')) {
        data.학술.push({ date: null, content: text });
      } else {
        data.경력.push({ date: null, content: text });
      }
    });

    return data;
  }, url);

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();