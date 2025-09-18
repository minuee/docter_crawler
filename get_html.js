const { chromium } = require('playwright');

async function getHtml() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.hanilmed.net/portal/deptMn/deptMnDoctorPop.do?menuNo=24010103&dcCode=25510006&dtCode=03010500%20&dcDept1=03010500', { waitUntil: 'networkidle' });
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log(bodyHtml);
  await browser.close();
}

getHtml();
