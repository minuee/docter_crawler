const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const jsonPath = process.argv[2];
    if (!jsonPath) {
        console.error('Please provide a path to the JSON file as an argument.');
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
        console.error(`Failed to read or parse JSON file: ${jsonPath}`, e);
        process.exit(1);
    }

    const { hospital_site } = doctorData;

    if (!hospital_site) {
        console.error('hospital_site not found in the JSON file.');
        process.exit(1);
    }

    console.log(`Starting slow paper extraction from ${hospital_site}... This may take a few minutes.`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const papers = new Set(doctorData['논문'] || []); // Start with existing papers if any

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 45000 });

        const moreButton = page.locator('button#_toggleThesis');
        if (await moreButton.count() > 0) {
            await moreButton.click();
            await page.waitForSelector('ul#_thesisContainer li', { state: 'visible', timeout: 10000 });

            while (true) {
                const paperTitles = await page.locator('ul#_thesisContainer span[data-key="thesisNm"]').allTextContents();
                paperTitles.forEach(t => papers.add(t.trim().replace(/"/g, '')));

                const nextButton = page.locator('a.next[data-thesispaging="next"]');
                const isDisabled = await nextButton.count() === 0 || (await nextButton.getAttribute('class') || '').includes('disabled');

                if (isDisabled) {
                    break; 
                }
                
                await nextButton.click();
                await page.waitForTimeout(2000); // Using the simple but slow wait as requested
            }
        }
        
        doctorData['논문'] = Array.from(papers);
        console.log(`Successfully extracted ${papers.size} papers.`);

    } catch (e) {
        console.error('Error during paper extraction:', e.stack);
        doctorData.error = (doctorData.error || '') + ` | Paper extraction failed: ${e.message}`;
    } finally {
        await browser.close();
        fs.writeFileSync(jsonPath, JSON.stringify(doctorData, null, 2));
        console.log(`File updated with paper data: ${jsonPath}`);
    }
})();
