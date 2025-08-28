const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function parseWithPlaywright(doctorData) {
    const { hospital_site, bedoc_doctorname } = doctorData;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log(`[Playwright] Navigating to ${hospital_site} for ${bedoc_doctorname}...`);
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        let htmlContent = await page.content();
        if (!htmlContent.includes(bedoc_doctorname)) {
            console.log(`[Playwright] Doctor not on initial page. Searching for staff link for ${bedoc_doctorname}...`);
            const staffLinkSelectors = [
                // Functions returning Locators for more flexible text matching
                (page) => page.getByText(/\uC758\uB8CC\uC9C4|\uC9C4\uB8CC\uACFC|\uC758\uC0AC\uC18C\uAC1C|\uAD50\uC218\uC9C4|\uC758\uC0AC|\uAD50\uC218|\uC758\uB8CC|\uC9C4\uB8CC/i),
                (page) => page.getByRole('link', { name: /\uC758\uB8CC\uC9C4|\uC9C4\uB8CC\uACFC|\uC758\uC0AC\uC18C\uAC1C|\uAD50\uC218\uC9C4|\uC758\uC0AC|\uAD50\uC218|\uC758\uB8CC|\uC9C4\uB8CC/i }),
                (page) => page.getByRole('button', { name: /\uC758\uB8CC\uC9C4|\uC9C4\uB8CC\uACFC|\uC758\uC0AC\uC18C\uAC1C|\uAD50\uC218\uC9C4|\uC758\uC0AC|\uAD50\uC218|\uC758\uB8CC|\uC9C4\uB8CC/i }),
                // String selectors for partial href matches (still useful)
                'a[href*="doctor"]', 'a[href*="staff"]', 'a[href*="medical"]', 'a[href*="dept"]',
                // String selectors for text matches within list items or other common containers
                'li:has-text(/\uC758\uB8CC\uC9C4|\uC9C4\uB8CC\uACFC|\uC758\uC0AC\uC18C\uAC1C|\uAD50\uC218\uC9C4|\uC758\uC0AC|\uAD50\uC218|\uC758\uB8CC|\uC9C4\uB8CC/i) a',
                'div:has-text(/\uC758\uB8CC\uC9C4|\uC9C4\uB8CC\uACFC|\uC758\uC0AC\uC18C\uAC1C|\uAD50\uC218\uC9C4|\uC758\uC0AC|\uAD50\uC218|\uC758\uB8CC|\uC9C4\uB8CC|\uC548\uB0B4|\uC18C\uAC1C/i) a', // Added 안내, 소개
            ];

            let staffLinkFound = false;
            for (const selector of staffLinkSelectors) {
                let link = null;
                if (typeof selector === 'string') {
                    link = page.locator(selector).first();
                } else { // It's a function returning a Locator
                    link = selector(page).first();
                }

                if (await link.isVisible()) {
                    console.log(`[Playwright] Found staff link with selector: ${selector}. Clicking...`);
                    await link.click();
                    await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
                    staffLinkFound = true;
                    break;
                }
            }

            if (!staffLinkFound) {
                throw new Error('Could not find medical staff/department link.');
            }

            // More flexible doctor link finding
            // Try to find the doctor's name as text, then find a link near it
            const doctorNameLocator = page.getByText(new RegExp(bedoc_doctorname, 'i'));
            let doctorLink = null;

            // Option 1: Doctor's name is directly a link
            doctorLink = doctorNameLocator.getByRole('link').first();
            if (await doctorLink.isVisible()) {
                console.log(`[Playwright] Found doctor link by name as link.`);
            } else {
                // Option 2: Doctor's name is in a container, and a link is nearby
                const parentOfName = doctorNameLocator.locator('..').first(); // Parent element
                doctorLink = parentOfName.getByRole('link').first();
                if (await doctorLink.isVisible()) {
                    console.log(`[Playwright] Found doctor link by name in parent.`);
                } else {
                    // Option 3: Doctor's name is in a container, and a link is a sibling
                    const siblingOfName = doctorNameLocator.locator('+ *').first(); // Next sibling
                    doctorLink = siblingOfName.getByRole('link').first();
                    if (await doctorLink.isVisible()) {
                        console.log(`[Playwright] Found doctor link by name in next sibling.`);
                    } else {
                        const prevSiblingOfName = doctorNameLocator.locator('preceding-sibling::*').first(); // Previous sibling
                        doctorLink = prevSiblingOfName.getByRole('link').first();
                        if (await doctorLink.isVisible()) {
                            console.log(`[Playwright] Found doctor link by name in previous sibling.`);
                        } else {
                            // Option 4: Fallback to finding any link on the page that contains the doctor's name in its text
                            doctorLink = page.locator(`a:has-text("${bedoc_doctorname}")`).first();
                            if (await doctorLink.isVisible()) {
                                console.log(`[Playwright] Found doctor link by direct text match.`);
                            } else {
                                doctorLink = null; // No link found
                            }
                        }
                    }
                }
            }

            if (!doctorLink || !(await doctorLink.isVisible())) {
                throw new Error(`Could not find link for doctor ${bedoc_doctorname} on staff page.`);
            }

            console.log(`[Playwright] Found doctor link. Clicking...`);
            await doctorLink.click();
            await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
        }

        console.log(`[Playwright] Parsing final page content for ${bedoc_doctorname}.`);
        htmlContent = await page.content();
        const finalUrl = page.url();

        const title = await page.title(); // Keep this for now, will be replaced by cheerio parsing later
        console.log(`[Playwright] Page title: ${title}`);
        return { success: true, title: title };
    } catch (error) {
        let errorMessage = error.message;
        if (errorMessage.includes('Timeout 30000ms exceeded')) {
            errorMessage = `Navigation timeout: ${hospital_site} took too long to load.`;
        }
        console.error(`Error during minimal crawl: ${errorMessage}`);
        return { success: false, error: errorMessage };
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }
}

module.exports = { parseWithPlaywright };
