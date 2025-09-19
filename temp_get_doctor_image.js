const { chromium } = require('playwright');

(async () => {
    const url = process.argv[2];
    const doctorName = process.argv[3];

    if (!url || !doctorName) {
        console.error('URL and doctor name required');
        process.exit(1);
    }

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const imageUrl = await page.evaluate((name) => {
            const nameElements = Array.from(document.querySelectorAll('*')).filter(el => el.textContent.includes(name));

            if (nameElements.length > 0) {
                let parent = nameElements[0].parentElement;
                let imageElement = null;
                for (let i = 0; i < 5 && parent; i++) { // Look up 5 levels max
                    imageElement = parent.querySelector('img');
                    if (imageElement) {
                        if (imageElement.src.includes('doctor') || imageElement.src.includes('profile') || imageElement.src.includes('jpg') || imageElement.src.includes('png')) {
                           return imageElement.src;
                        }
                    }
                    parent = parent.parentElement;
                }
                let sibling = nameElements[0].nextElementSibling;
                 for (let i = 0; i < 5 && sibling; i++) {
                    imageElement = sibling.querySelector('img');
                    if (imageElement) return imageElement.src;
                    sibling = sibling.nextElementSibling;
                 }

            }
            return null; // Return null if no suitable image is found
        }, doctorName);

        if (imageUrl) {
            console.log(imageUrl);
        } else {
            console.error(`Could not find an image associated with '${doctorName}'.`);
        }

    } catch (e) {
        console.error(`Error: ${e.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
