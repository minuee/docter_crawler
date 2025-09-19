const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('https://bundang.chamc.co.kr/professor/profile.cha?idx=351', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });
    console.log('Screenshot saved as debug_screenshot.png');
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();