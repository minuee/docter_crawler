
const { chromium } = require('playwright');
const fs = require('fs');

async function getPageContent(url) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        const content = await page.content();
        console.log(content);
    } catch (e) {
        console.error('Error fetching page content:', e);
    } finally {
        await browser.close();
    }
}

// We can hardcode the URL for this specific debugging task.
const url = 'https://www.cmcism.or.kr/treatment/treatment_team?deptSeq=32#';
getPageContent(url);
