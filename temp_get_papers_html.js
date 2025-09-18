
const { chromium } = require('playwright');

async function getPapersHtml() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.schmc.ac.kr/seoul/doctr/home.do?key=1605&doctrNo=1170', { waitUntil: 'networkidle' });

  try {
    // Click the main toggle to show the paper section
    const moreButton = page.locator('button#_toggleThesis');
    await moreButton.click();
    await page.waitForSelector('ul#_thesisContainer li', { state: 'visible', timeout: 5000 });

    // Get the HTML of the paper container
    const papersContainerHtml = await page.locator('ul#_thesisContainer').locator('..').innerHTML();
    console.log(papersContainerHtml);

  } catch (e) {
    console.error(e.message);
  } finally {
    await browser.close();
  }
}

getPapersHtml();
