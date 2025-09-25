
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
        await page.waitForTimeout(5000); // Wait for popup to appear
        await page.screenshot({ path: '.playwright-mcp/temp-minyoungil-screenshot.png', fullPage: true });
        console.log('Screenshot for OCR saved to .playwright-mcp/temp-minyoungil-screenshot.png');
      } else {
        throw new Error('More button not found');
      }
    } else {
      throw new Error('Doctor not found');
    }
  } catch (error) {
    console.error('Error during OCR script execution:', error);
  } finally {
    await browser.close();
  }
})();
