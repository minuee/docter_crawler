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
    const data = {};

    // Helper function to extract list items from a <dl> given the <dt> text
    const extractDlList = (title) => {
      const dtElement = Array.from(document.querySelectorAll('.doc-sub-container dt')).find(dt => dt.textContent.trim() === title);
      if (!dtElement) return [];
      const ddElement = dtElement.nextElementSibling;
      if (!ddElement || ddElement.tagName !== 'DD') return [];
      const listItems = ddElement.querySelectorAll('li');
      return Array.from(listItems).map(li => li.innerText.trim()).filter(Boolean);
    };
    
    const extractDlListWithDate = (title) => {
        const items = extractDlList(title);
        return items.map(item => {
            const yearMatch = item.match(/^(\d{4})/);
            const date = yearMatch ? yearMatch[0] : null;
            const content = item.replace(/^(\d{4})\s*/, '').trim();
            return { date, content };
        });
    };

    // Profile URL
    const profileImg = document.querySelector('.doc-main .profile-img img');
    if (profileImg && profileImg.src) {
      data.profileUrl = new URL(profileImg.src, pageUrl).href;
    }

    // Specialty
    const specialtyEl = document.querySelector('.dr-part dd');
    if (specialtyEl) {
      data.specialty = specialtyEl.innerText.trim().replace(/\n/g, ' ');
    }

    // Extract data using the helper
    data.학력 = extractDlList('학력').map(content => ({ date: null, content }));
    data.경력 = extractDlList('경력').map(content => ({ date: null, content }));
    data.학술 = extractDlList('학술활동').map(content => ({ date: null, content }));
    data.저서 = extractDlList('저서').map(content => ({ date: null, content }));
    data.수상 = extractDlListWithDate('수상');
    
    // Papers need special handling for <br> tags
    const paperDl = Array.from(document.querySelectorAll('.doc-sub-container dt')).find(dt => dt.textContent.trim() === '주요 논문');
    if(paperDl) {
        const paperDd = paperDl.nextElementSibling;
        if(paperDd) {
            data.논문 = Array.from(paperDd.querySelectorAll('li')).map(li => li.innerText.trim());
        }
    }

    return data;
  }, url);

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();
