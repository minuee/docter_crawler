const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://www.seraneye.com/page.php?hid=%EC%9D%98%EB%A3%8C%EC%A7%84%EC%86%8C%EA%B0%9C&pageIndex=110102', { waitUntil: 'networkidle' });
    const doctorLink = await page.locator('ul.doctor li a:has-text("임승정")').first();
    if (await doctorLink.count() > 0) {
      const href = await doctorLink.getAttribute('href');
      console.log(new URL(href, page.url()).href); // Print the absolute URL
    } else {
      console.error('Doctor link not found');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();