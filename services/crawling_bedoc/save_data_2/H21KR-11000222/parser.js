
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

    // 1. Locate the specific doctor's information block.
    const doctorContainer = page.locator(`.docInfo:has(p.name > b:text-is("${doctorName}"))`);
    await doctorContainer.waitFor({ state: 'visible', timeout: 10000 });

    // 2. Scrape initial data from the visible part.
    const initialData = await doctorContainer.evaluate(node => {
        const data = {};
        const baseUrl = document.location.origin;

        const profileImg = node.querySelector('.pic img');
        if (profileImg) {
            data.profileUrl = new URL(profileImg.src, baseUrl).href;
        }

        const specialtyEl = Array.from(node.querySelectorAll('.info .roll .tit')).find(el => el.innerText.includes('전문분야'));
        if (specialtyEl) {
            data.specialty = specialtyEl.nextSibling.textContent.trim();
        }
        return data;
    });

    // 3. Click the "주요경력" button and scrape the content.
    const experienceBtn = doctorContainer.locator('button:has-text("주요경력")');
    await experienceBtn.click();
    // The content is in the first div.cont inside div.btnCont
    const experienceContent = doctorContainer.locator('.btnCont > .cont').first();
    await experienceContent.waitFor({ state: 'visible', timeout: 5000 });
    const 경력 = await experienceContent.evaluate(node => 
        Array.from(node.querySelectorAll('li')).map(li => ({ date: null, content: li.innerText.trim() }))
    );

    // 4. Click the "논문&연구실적" button and scrape the content.
    const papersBtn = doctorContainer.locator('button:has-text("논문&연구실적")');
    await papersBtn.click();
    // The content is in the second div.cont inside div.btnCont
    const papersContent = doctorContainer.locator('.btnCont > .cont').nth(1);
    await papersContent.waitFor({ state: 'visible', timeout: 5000 });
    const 논문 = await papersContent.evaluate(node => 
        Array.from(node.querySelectorAll('li')).map(li => li.innerText.trim())
    );

    // 5. Combine all data
    const finalData = {
        ...initialData,
        경력,
        논문,
        학력: [], // No specific education tab found, it's mixed with experience
        학술: [], // No specific academic society tab found
        수상: [], // No awards tab found
    };

    console.log(JSON.stringify(finalData, null, 2));

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
