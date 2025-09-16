const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function parseWithPlaywright(doctorData) {
    const { doctor_url, bedoc_doctorname, bedoc_deptname } = doctorData;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log(`[Playwright] Navigating to ${doctor_url} for ${bedoc_doctorname}...`);
        try {
            await page.goto(doctor_url, { waitUntil: 'networkidle', timeout: 120000 });
        } catch (e) {
            if (e.message.includes('Timeout')) {
                throw new Error(`Initial navigation timeout: ${hospital_site} took too long to load.`);
            }
            throw e; // Re-throw other errors
        }

        let htmlContent = await page.content();
        
        if (!htmlContent.includes(bedoc_doctorname)) {
            console.log(`[Playwright] Doctor not on initial page. Searching for staff link for ${bedoc_doctorname}...`);
            const staffLinkSelectors = [
                (page) => page.getByText(/의료진|진료과|의사소개|교수진|의사|교수|의료|진료|안내|소개/i),
                (page) => page.getByRole('link', { name: /의료진|진료과|의사소개|교수진|의사|교수|의료|진료|안내|소개/i }),
                (page) => page.getByRole('button', { name: /의료진|진료과|의사소개|교수진|의사|교수|의료|진료|안내|소개/i }),
                'a[href*="doctor"]', 'a[href*="staff"]', 'a[href*="medical"]', 'a[href*="dept"]',
                (page) => page.locator('li').filter({ hasText: /의료진|진료과|의사소개|교수진|의사|교수|의료|진료|안내|소개/i }).getByRole('link'),
                (page) => page.locator('div').filter({ hasText: /의료진|진료과|의사소개|교수진|의사|교수|의료|진료|안내|소개/i }).getByRole('link'),
            ];

            let staffLinkFound = false;
            for (const selector of staffLinkSelectors) {
                let link = null;
                if (typeof selector === 'string') {
                    link = page.locator(selector).first();
                } else {
                    link = selector(page).first();
                }

                if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
                    console.log(`[Playwright] Found staff link. Clicking...`);
                    try {
                        await link.click();
                        await page.waitForLoadState('domcontentloaded', { timeout: 120000 });
                    } catch (e) {
                        if (e.message.includes('Timeout')) {
                            console.log(`[Playwright] Navigation after staff link click timed out.`);
                            continue; // Try next selector
                        }
                        throw e; // Re-throw other errors
                    }
                    staffLinkFound = true;
                    break;
                }
            }

            if (!staffLinkFound) {
                throw new Error('Could not find medical staff/department link.');
            }

            const doctorLinkLocator = page.getByRole('link', { name: new RegExp(bedoc_doctorname, 'i') });
            if (await doctorLinkLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
                 console.log(`[Playwright] Found doctor link. Clicking...`);
                 try {
                     await doctorLinkLocator.click();
                     await page.waitForLoadState('domcontentloaded', { timeout: 120000 });
                 } catch (e) {
                     if (e.message.includes('Timeout')) {
                         console.log(`[Playwright] Navigation after doctor link click timed out.`);
                         // We don't re-throw here, as we'll return current page URL
                     } else {
                         throw e; // Re-throw other errors
                     }
                 }
            } else {
                console.log(`[Playwright] Doctor link not immediately found, returning current page URL.`);
            }
        }

        const finalUrl = page.url();
        console.log(`[Playwright] Returning final URL: ${finalUrl}`);
        return { success: true, profileUrl: finalUrl };

    } catch (error) {
        let errorMessage = error.message;
        if (errorMessage.includes('Timeout')) {
            errorMessage = `Navigation timeout: ${hospital_site} took too long to load.`;
        }
        console.error(`[Playwright] Error for ${bedoc_doctorname}: ${errorMessage}`);
        return { success: false, error: errorMessage };
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }
}

module.exports = { parseWithPlaywright };