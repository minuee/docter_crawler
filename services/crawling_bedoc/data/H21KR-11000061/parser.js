const { chromium } = require('playwright');

const bedoc_doctorname = process.argv[2];
const hospital_site = process.argv[3];

async function parse() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // Find the doctor's list item
        const doctorListItem = page.locator('ul.intro_doctors_list > li', { has: page.locator(`h5:has-text("${bedoc_doctorname}")`) });
        
        // Get the doctor's number and click the 'details' button
        const moreButton = doctorListItem.locator('.btn_more_doctors');
        const doctorNum = await moreButton.getAttribute('data-num');
        if (!doctorNum) {
            throw new Error(`Could not find data-num for doctor ${bedoc_doctorname}`);
        }
        await moreButton.click();
        
        // Wait for the dynamic popup to be visible
        const popupSelector = `div.layers li[data-n="${doctorNum}"]`;
        const popup = page.locator(popupSelector);
        await popup.waitFor({ state: 'visible', timeout: 5000 });

        const specialty = await popup.locator('p.profilepopup_02_02_01').textContent();

        const profileItems = await popup.locator('ul.profilepopup_02_02_02 li p').allTextContents();
        const awardsItems = await popup.locator('ul.profilepopup_02_02_04').nth(0).locator('li p').allTextContents();
        const mediaItems = await popup.locator('ul.profilepopup_02_02_04').nth(1).locator('li p').allTextContents();
        const paperItems = await popup.locator('ul.profilepopup_02_02_05 li p').allTextContents();

        const experience = profileItems.map(item => ({ date: null, content: item.replace(/· /g, '').trim() }));
        const awards = awardsItems.map(item => ({ date: null, content: item.replace(/· /g, '').trim() }));
        const media = mediaItems.map(item => ({ targetDate: null, type: '방송', text: item.replace(/· /g, '').trim(), url: null, issuer: null }));
        const papers = paperItems.map(item => item.trim());

        synthesizedData = {
            specialty: specialty ? specialty.replace(/\s+/g, ' ').trim() : null,
            '경력': experience,
            '수상': awards,
            '언론': media,
            '논문': papers,
        };

    } catch (e) {
        synthesizedData.error = e.message;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify(synthesizedData, null, 2));
}

parse();