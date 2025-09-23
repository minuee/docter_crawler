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

    const nameElement = await page.locator(`//p[contains(., "${doctorName}")]`).first();
    const doctorBlock = await nameElement.locator('xpath=./ancestor::div[contains(@id, "w20")]/ancestor::div[contains(@class, "col-dz-")]').first();
    const clickElement = await doctorBlock.locator('a[href*="SITE.openModalMenu"]').first();

    // Scroll the element into view before clicking
    await clickElement.scrollIntoViewIfNeeded();

    await clickElement.click();

    const modal = await page.locator('div[id^="im-modal"][role="dialog"]').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });

    const doctorData = await modal.evaluate(modalNode => {
        const data = {};
        const baseUrl = document.location.origin;

        data.profileUrl = modalNode.querySelector('.cn-staff-modal-thumb-inner img')?.src || null;
        data.specialty = modalNode.querySelector('.cn-staff-modal-field')?.textContent.trim() || null;

        const bioNode = modalNode.querySelector('.cn-staff-modal-bio-inner');
        if (bioNode) {
            const sections = {
                '학력': [],
                '경력': [],
                '학술': [],
            };
            let currentSection = null;

            bioNode.querySelectorAll('p').forEach(p => {
                const text = p.innerText.trim();
                if (text.startsWith('[')) {
                    if (text.includes('학력')) currentSection = '학력';
                    else if (text.includes('경력')) currentSection = '경력';
                    else if (text.includes('학회활동')) currentSection = '학술';
                    else currentSection = null;
                } else if (currentSection && text) {
                    sections[currentSection].push({ date: null, content: text });
                }
            });
            data.학력 = sections['학력'];
            data.경력 = sections['경력'];
            data.학술 = sections['학술'];
        }
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