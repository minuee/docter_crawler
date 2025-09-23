const { chromium } = require('playwright');

(async () => {
  const timeout = 2 * 60 * 1000; // 2-minute timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const url = process.argv[2];
    if (!url) {
      console.error('Please provide a URL as a command-line argument.');
      process.exit(1);
    }

    console.log(`[DEBUG] Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('[DEBUG] Navigation successful. Evaluating page...');

    const doctorData = await page.evaluate(() => {
      const data = {};
      const baseUrl = 'https://www.ish.or.kr';

      // Profile URL from background-image
      const profileBgDiv = document.querySelector('.section1 > .wsize');
      if (profileBgDiv) {
        const style = profileBgDiv.getAttribute('style');
        const match = style.match(/url\((['"]?)(.*?)\1\)/);
        if (match && match[2]) {
          data.profileUrl = new URL(match[2], baseUrl).href;
        }
      }

      // Specialty
      data.specialty = document.querySelector('p.clinic > span')?.textContent.trim() || null;

      // Helper to process sections like 학력, 경력
      const extractDlSection = (title) => {
        const dts = Array.from(document.querySelectorAll('dl.jsInfo dt'));
        const targetDt = dts.find(dt => dt.textContent.trim() === title);
        if (!targetDt) return [];

        const liElements = Array.from(targetDt.nextElementSibling.querySelectorAll('li'));
        return liElements.map(li => {
          const dateEl = li.querySelector('span');
          let date = null;
          let content = '';

          if (dateEl) {
            date = dateEl.textContent.trim();
            // Remove the span to get the remaining content
            const clone = li.cloneNode(true);
            clone.querySelector('span').remove();
            content = clone.textContent.trim();
          } else {
            content = li.textContent.trim();
          }
          return { date, content };
        });
      };
      
      // 학회활동, 수상 (different structure)
      const extractNodateDlSection = (title) => {
        const dts = Array.from(document.querySelectorAll('dl.jsInfo.nodate dt'));
        const targetDt = dts.find(dt => dt.textContent.trim() === title);
        if (!targetDt) return [];

        const liElements = Array.from(targetDt.nextElementSibling.querySelectorAll('li'));
        return liElements.map(li => {
            let text = li.textContent.trim();
            let date = null;
            let content = text;
            const dateMatch = text.match(/\((.*?)\)/);
            if(dateMatch && dateMatch[1]){
                date = dateMatch[1].trim();
                content = text.replace(/\((.*?)\)/, '').trim();
            }
            return { date, content };
        });
      };

      // Papers
      const extractPapers = () => {
        const dts = Array.from(document.querySelectorAll('dl.jsInfo.w100 dt'));
        const targetDt = dts.find(dt => dt.textContent.trim() === '논문');
        if (!targetDt) return [];

        const liElements = Array.from(targetDt.nextElementSibling.querySelectorAll('li'));
        return liElements.map(li => {
          const year = li.querySelector('p.year')?.textContent.trim();
          const title = li.querySelector('div > p')?.textContent.trim();
          const journal = li.querySelector('div > span')?.textContent.trim();
          return `${title} (${journal}, ${year}년)`;
        });
      };

      data.경력 = extractDlSection('경력');
      data.학력 = extractDlSection('학력');
      data.학술 = extractNodateDlSection('학회활동');
      data.수상 = extractNodateDlSection('수상');
      data.논문 = extractPapers();

      return data;
    });

    console.log(JSON.stringify(doctorData, null, 2));

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Script timed out after 2 minutes.');
    } else {
      console.error('An error occurred:', error);
    }
    console.log(JSON.stringify({}, null, 2)); // Output empty for failure
  } finally {
    clearTimeout(timer);
    await browser.close();
  }
})();