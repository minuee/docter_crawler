const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.jejunuh.co.kr/dept/imh/medicalstaff/_/10251/docDtl.do?showTab=profile', { waitUntil: 'networkidle' });
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('/Users/kormedi/Documents/WorkPlace/bitbucket/docter_crawler/temp_jejunuh_detail_body.html', bodyHTML);
  await browser.close();
})();