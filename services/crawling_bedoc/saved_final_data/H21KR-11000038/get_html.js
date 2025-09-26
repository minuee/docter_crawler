const { chromium } = require('playwright');
const fs = require('fs');

async function getPageContent(url) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const content = await page.content();
        console.log(content);
    } catch (e) {
        console.error('Error fetching page content:', e);
    } finally {
        await browser.close();
    }
}

const doctorFilePath = process.argv[2];
const doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
getPageContent(doctorData.hospital_site);