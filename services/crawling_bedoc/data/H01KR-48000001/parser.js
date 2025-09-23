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

  // --- Part 1: Scrape initial view (first tab) ---
  const initialData = await page.evaluate((pageUrl) => {
    const data = {
      학력: [],
      경력: [],
      수상: [],
      학술: [],
      specialty: null,
      profileUrl: null,
    };

    // Profile URL
    const profileImg = document.querySelector('.staff-wrap.detail .img img');
    if (profileImg && profileImg.src) {
      data.profileUrl = new URL(profileImg.src, pageUrl).href;
    }

    // Specialty
    const specialtyEl = document.querySelector('.clinic dd');
    if (specialtyEl) {
      data.specialty = specialtyEl.innerText.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
    }

    // Main content block
    const contentEl = document.querySelector('.tab-content .bullet-gray .depth2');
    if (contentEl) {
      const lines = contentEl.innerHTML.split(/<br\s*\/?>/i);
      let currentCategory = '';

      lines.forEach(line => {
        const text = line.trim();
        if (!text) return;

        if (text.startsWith('[') && text.endsWith(']')) {
          currentCategory = text;
          return;
        }
        
        const yearMatch = text.match(/^(\d{4})/);
        const date = yearMatch ? yearMatch[0] : null;
        const content = text.replace(/^(\d{4}\s*~\s*현재|\d{4}\s*~\s*\d{4}|\d{4}\.\s*\d{2}|\d{4})\s*/, '').trim();

        switch (currentCategory) {
          case '[약력]':
          case '[면허/자격]':
            data.경력.push({ date, content: text }); // Keep full line for context
            break;
          case '[교육/연구 경력]':
            if (text.includes('석사') || text.includes('박사') || text.includes('의학사')) {
                data.학력.push({ date, content: content });
            } else {
                data.학술.push({ date, content: content });
            }
            break;
          case '[학회활동]':
            data.학술.push({ date: null, content: text });
            break;
          case '[수상경력]':
            data.수상.push({ date, content: content });
            break;
        }
      });
    }
    return data;
  }, url);


  // --- Part 2: Click second tab and scrape ---
  await page.click('.tab-wrap .tab .btn:nth-child(2)');
  // Give it a moment for the content to switch
  await page.waitForFunction(() => {
      const tabContent = document.querySelectorAll('.tab-content');
      return tabContent.length > 1 && tabContent[1].style.display !== 'none';
  });

  const secondTabData = await page.evaluate(() => {
      const data = { 저서: [], 논문: [] };
      const contentEl = document.querySelectorAll('.tab-content')[1];
      if (!contentEl) return data;

      const lines = contentEl.querySelector('.bullet-gray').innerHTML.split(/<br\s*\/?>/i);
      let currentCategory = '';

      lines.forEach(line => {
          const text = line.replace(/<[^>]+>/g, '').trim(); // Strip any remaining html tags
          if (!text) return;

          if (text.startsWith('[') && text.endsWith(']')) {
              currentCategory = text;
              return;
          }

          switch (currentCategory) {
              case '[출판된 책]':
                  const yearMatch = text.match(/^(\d{4})/);
                  const date = yearMatch ? yearMatch[0] : null;
                  const content = text.replace(/^(\d{4})\s*/, '').trim();
                  data.저서.push({ date, content });
                  break;
              case '[주요논문 : 이외 다수]':
                  if(text.length > 10) { // Filter out short/irrelevant lines
                    data.논문.push(text);
                  }
                  break;
          }
      });
      return data;
  });

  // --- Part 3: Combine and output ---
  const finalData = { ...initialData, ...secondTabData };
  console.log(JSON.stringify(finalData, null, 2));

  await browser.close();
})();
