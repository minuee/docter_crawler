
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];

  if (!url) {
    console.error('Please provide a URL as a command-line argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Corrected selector to wait for the main container
    await page.waitForSelector('.medipart_profile', { timeout: 30000 });

    const doctorData = await page.evaluate(() => {
      const data = { 학력: [], 경력: [], 학술: [], 수상: [], 저서: [], 논문: [], 언론: [] };
      const baseUrl = 'https://mjh.or.kr';

      // Profile URL
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

      // Main info sections
      const extractSection = (title) => {
          const dtElement = Array.from(document.querySelectorAll('.section2 .jsInfo dt')).find(dt => dt.textContent.trim().startsWith(title));
          if (!dtElement) return [];
          const ddElement = dtElement.nextElementSibling;
          if (!ddElement || ddElement.tagName !== 'DD') return [];
          return Array.from(ddElement.querySelectorAll('ul li')).map(li => {
              return { date: null, content: li.textContent.trim() };
          }).filter(item => item.content);
      };

      data.학력 = extractSection('학력');
      data.경력 = extractSection('경력');
      data.학술 = extractSection('학회');
      data.수상 = extractSection('수상');
      data.저서 = extractSection('저서');
      
      // 논문 is slightly different, no date/content structure needed
      const thesisDt = Array.from(document.querySelectorAll('.section2 .jsInfo dt')).find(dt => dt.textContent.trim().startsWith('논문'));
      if (thesisDt) {
          const thesisDd = thesisDt.nextElementSibling;
          if (thesisDd) {
              data.논문 = Array.from(thesisDd.querySelectorAll('ul li')).map(li => li.textContent.trim()).filter(item => item);
          }
      }

      // Media Section 3
      document.querySelectorAll('.section3 .item a').forEach(item => {
          const title = item.querySelector('.title')?.textContent.trim();
          const targetDate = item.querySelector('.date')?.textContent.trim();
          const url = item.href;
          const issuer = item.querySelector('.cate')?.textContent.trim();
          if (title) {
              data.언론.push({ targetDate, type: '기사', text: title, url, issuer });
          }
      });

      // Media Section 4
      document.querySelectorAll('.section4 .table1 tbody tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length === 3) {
              const issuer = cells[0].textContent.trim();
              const title = cells[1].textContent.trim();
              const url = cells[1].querySelector('a')?.href;
              const targetDate = cells[2].textContent.trim();
              if (title) {
                  data.언론.push({ targetDate, type: '기사', text: title, url, issuer });
              }
          }
      });

      return data;
    });

    console.log(JSON.stringify(doctorData, null, 2));

  } catch (e) {
      console.error(JSON.stringify({error: `Execution failed: ${e.message}`}));
  } finally {
      await browser.close();
  }
})();
