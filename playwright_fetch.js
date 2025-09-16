const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('https://www.ish.or.kr/main/doctor/view.do?doctor_code=555047', { waitUntil: 'networkidle' });
    const htmlContent = await page.content();
    console.log(htmlContent);
  } catch (error) {
    console.error('Error fetching page content:', error);
  } finally {
    await browser.close();
  }
})();