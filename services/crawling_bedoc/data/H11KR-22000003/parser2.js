const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as a command-line argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const doctorData = await page.evaluate(() => {
      const data = {};
      const baseUrl = 'https://www.ish.or.kr';

      const profileBgDiv = document.querySelector('.section1 > .wsize');
      if (profileBgDiv) {
        const style = profileBgDiv.getAttribute('style');
        const match = style.match(/url\((['"]?)(.*?)\\1\)/);
        if (match && match[2]) {
          data.profileUrl = new URL(match[2], baseUrl).href;
        }
      }

      data.specialty = document.querySelector('p.clinic > span')?.textContent.trim() || null;

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
            const clone = li.cloneNode(true);
            clone.querySelector('span').remove();
            content = clone.textContent.trim();
          } else {
            content = li.textContent.trim();
          }
          return { date, content };
        });
      };
      
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

    fs.writeFileSync('parser_output.json', JSON.stringify(doctorData, null, 2));

  } catch (error) {
      console.error('An error occurred:', error);
      fs.writeFileSync('parser_output.json', JSON.stringify({}, null, 2));
  } finally {
    await browser.close();
  }
})();