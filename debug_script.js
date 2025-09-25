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
        await moreButton.click();
        // Wait for the popup to appear. Let's assume it's a modal and wait for a selector.
        // Since we don't know the selector, we'll just wait for a fixed time.
        await page.waitForTimeout(5000);

        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync('debug_page.html', bodyHtml);

        await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });

        console.log('Debug files (debug_page.html, debug_screenshot.png) saved.');

      } else {
        throw new Error('More button not found for doctor 민영일');
      }
    } else {
      throw new Error('Doctor 민영일 not found on the page.');
    }
  } catch (error) {
    console.error('Error during debug script execution:', error);
  } finally {
    await browser.close();
  }
})();