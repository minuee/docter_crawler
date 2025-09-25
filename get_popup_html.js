
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.vievisnamuh.com/user/hpm/smt/SMTPage.do', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.staff_list');

    const doctorElements = await page.$$('.staff_list > div');
    let targetDoctorElement = null;

    for (const element of doctorElements) {
      const nameElement = await element.$('strong#drName');
      if (nameElement) {
        const nameText = await nameElement.innerText();
        if (nameText.includes('민영일')) {
          targetDoctorElement = element;
          break;
        }
      }
    }

    if (targetDoctorElement) {
      const moreButton = await targetDoctorElement.$('a.more');
      if (moreButton) {
        await page.evaluate(button => button.click(), moreButton);
        await page.waitForSelector('div.layer_pop.open', { timeout: 20000 });
        
        const popupHtml = await page.$eval('div.layer_pop.open', el => el.innerHTML);
        fs.writeFileSync('popup_content.html', popupHtml);
        console.log('Popup HTML content saved to popup_content.html');

      } else {
        throw new Error('More button not found for doctor 민영일');
      }
    } else {
      throw new Error('Doctor 민영일 not found on the page.');
    }
  } catch (error) {
    console.error('Error during script execution:', error.message);
  } finally {
    await browser.close();
  }
})();
