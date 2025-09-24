const { chromium } = require('playwright');
const fs = require('fs');

// 파싱 메인 함수
async function getPageHTML(doctorData) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle' });
        const html = await page.content();
        console.log(html);
    } catch (e) {
        console.error(`Playwright execution failed: ${e.message}`);
    } finally {
        if (browser) { await browser.close(); }
    }
}

// 메인 실행 로직
if (require.main === module) {
    const doctorFilePath = process.argv[2];
    if (!doctorFilePath) {
        console.error("Please provide the path to the doctor's JSON file.");
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Failed to read or parse file: ${doctorFilePath}`);
        process.exit(1);
    }

    getPageHTML(doctorData);
}