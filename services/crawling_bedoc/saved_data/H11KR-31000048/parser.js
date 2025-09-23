const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];

  if (!url) {
    console.error('Please provide a URL as a command-line argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  const doctorData = await page.evaluate(() => {
    const data = {};
    const baseUrl = 'https://mjh.or.kr';

    // Profile URL from background-image
    const profileDiv = document.querySelector('.section1 .wsize');
    if (profileDiv) {
        const style = window.getComputedStyle(profileDiv);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
            const urlMatch = bgImage.match(/url\("(.*?)"\)/);
            if (urlMatch && urlMatch[1]) {
                data.profileUrl = new URL(urlMatch[1], baseUrl).href;
            }
        }
    }

    // Specialty
    const specialtyP = document.querySelector('.info .clinic');
    if (specialtyP) {
        data.specialty = specialtyP.textContent.replace('전문진료분야','').trim();
    }

    // Function to extract sections from dl/dt/dd structure
    const extractSection = (title) => {
        const dtElement = Array.from(document.querySelectorAll('.section2 .jsInfo dt')).find(dt => dt.textContent.trim().startsWith(title));
        if (!dtElement) return [];
        const ddElement = dtElement.nextElementSibling;
        if (!ddElement || ddElement.tagName !== 'DD') return [];
        const listItems = ddElement.querySelectorAll('ul li');
        return Array.from(listItems).map(li => li.textContent.trim()).filter(item => item);
    };
    
    const extractSectionWithDate = (title) => {
        const dtElement = Array.from(document.querySelectorAll('.section2 .jsInfo dt')).find(dt => dt.textContent.trim().startsWith(title));
        if (!dtElement) return [];
        const ddElement = dtElement.nextElementSibling;
        if (!ddElement || ddElement.tagName !== 'DD') return [];
        const listItems = ddElement.querySelectorAll('ul li');
        return Array.from(listItems).map(li => {
            const content = li.textContent.trim();
            const dateMatch = content.match(/\d{4}$/);
            const date = dateMatch ? dateMatch[0] : null;
            const mainContent = date ? content.replace(date, '').trim() : content;
            return {date: date, content: mainContent };
        }).filter(item => item.content);
    }

    data.학력 = extractSection('학력');
    data.경력 = extractSection('경력');
    data.학술 = extractSection('학회');
    data.수상 = extractSectionWithDate('수상');
    data.저서 = extractSection('저서');
    data.논문 = extractSection('논문');

    return data;
  });

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();