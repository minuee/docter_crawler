
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const doctorName = process.argv[2];
  const url = process.argv[3];

  await page.goto(url, { waitUntil: 'networkidle' });

  const doctorElements = await page.$$('.docInfo');
  let result = {};

  for (const doctorElement of doctorElements) {
    const nameElement = await doctorElement.$('.name .tit');
    const name = await nameElement.innerText();

    if (name.trim() === doctorName) {
      const detailButton = await doctorElement.$('.btnDetail');
      if (detailButton) {
        await detailButton.click();
        // Wait for the animation to complete
        await page.waitForTimeout(500);
      }

      const profileUrl = await doctorElement.$eval('.pic img', img => img.src);
      const specialty = await doctorElement.$eval('.treat .txt', el => el.innerText.trim());

      const historyItems = await doctorElement.$$eval('.history ul li', lis => lis.map(li => li.innerText.trim()));

      const education = [];
      const experience = [];

      historyItems.forEach(item => {
        if (item.includes('졸업')) {
          education.push({ date: null, content: item });
        } else {
          experience.push({ date: null, content: item });
        }
      });

      result = {
        profileUrl,
        specialty,
        '학력': education,
        '경력': experience,
      };

      break;
    }
  }

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
