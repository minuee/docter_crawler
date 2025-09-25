const { chromium } = require('playwright');
const fs = require('fs');

async function extractText(page, selector) {
    try {
        return await page.$eval(selector, el => el.innerText.trim());
    } catch (e) {
        return null;
    }
}

async function extractItems(page, headerText) {
    try {
        const header = await page.$(`//strong[text()='${headerText}']`);
        if (!header) return [];

        const list = await header.evaluateHandle(h => h.nextElementSibling);
        const items = await list.$$('li');
        const result = [];
        for (const item of items) {
            const yearHandle = await item.$('.year');
            const txtHandle = await item.$('.txt');
            if (yearHandle && txtHandle) {
                const date = await yearHandle.innerText();
                const content = await txtHandle.innerText();
                result.push({ date: date.trim(), content: content.trim() });
            } else {
                const content = await item.innerText();
                result.push({ date: null, content: content.trim() });
            }
        }
        return result;
    } catch (e) {
        return [];
    }
}

(async () => {
    const doctorName = process.argv[2];
    const url = process.argv[3];

    if (!doctorName || !url) {
        console.error('Please provide doctor name and URL as arguments.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.staff_list');

        const doctorElements = await page.$$('.staff_list > div');
        let targetDoctorElement = null;

        for (const element of doctorElements) {
            const nameElement = await element.$('strong#drName');
            if (nameElement) {
                const nameText = await nameElement.innerText();
                if (nameText.includes(doctorName)) {
                    targetDoctorElement = element;
                    break;
                }
            }
        }

        if (targetDoctorElement) {
            const moreButton = await targetDoctorElement.$('a.more');
            if (moreButton) {
                await page.evaluate(button => button.click(), moreButton);
                await page.waitForTimeout(2000); // Add a small delay
                await page.waitForSelector('div.layer_pop.open', { timeout: 20000 });

                const popupSelector = 'div.layer_pop.open';

                const profileUrl = await page.$eval(`${popupSelector} .img_wrap img`, img => img.src).catch(() => null);
                const specialty = await page.$eval(`${popupSelector} .treat`, el => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);

                const 학력 = await extractItems(page, '학력');
                const 경력 = await extractItems(page, '경력');
                const 학술 = await extractItems(page, '학회활동');
                const 저서 = await extractItems(page, '논문/저서');

                synthesizedData = {
                    profileUrl,
                    specialty,
                    "학력": 학력,
                    "경력": 경력,
                    "학술": 학술,
                    "저서": 저서,
                };

            } else {
                throw new Error(`'More' button not found for doctor ${doctorName}`);
            }
        } else {
            throw new Error(`Doctor ${doctorName} not found on the page.`);
        }

    } catch (error) {
        synthesizedData.error = error.message;
    } finally {
        await browser.close();
        console.log(JSON.stringify(synthesizedData, null, 2));
    }
})();