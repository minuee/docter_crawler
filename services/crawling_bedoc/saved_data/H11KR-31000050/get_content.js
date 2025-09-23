
const { chromium } = require('playwright');

const url = process.argv[2];

async function getPageContent() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        const content = await page.content();
        console.log(content);
    } catch (e) {
        console.error(`Error fetching page content: ${e.message}`);
    } finally {
        await browser.close();
    }
}

getPageContent();
