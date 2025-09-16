const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Define findSectionData and findSpecialty outside parse function
const findSectionData = async (title, page) => {
    // Wait for the career container to be populated
    try {
        await page.waitForSelector('#_careerContainer ._careerIem', { state: 'attached', timeout: 10000 }); // Increased timeout
    } catch (e) {
        console.log(`No dynamic career items found for ${title}.`);
        return [];
    }

    const items = await page.$$eval('#_careerContainer ._careerIem', (elements) => {
        return elements.map(item => {
            const contentElement = item.querySelector('td[data-key="careerSj"]');
            return contentElement ? contentElement.innerText.trim().replace(/"/g, "'") : '';
        }).filter(c => c);
    });

    if (title === '학력') {
        return items.filter(item => item.includes('학사') || item.includes('석사') || item.includes('박사') || item.includes('졸업'))
                    .map(content => ({ content }));
    } else if (title === '경력') {
        return items.filter(item => !(item.includes('학사') || item.includes('석사') || item.includes('박사') || item.includes('졸업')))
                    .map(content => ({ content }));
    }
    return [];
};

const findSpecialty = async (page) => {
    const specialtyHeading = await page.$('span.sub_b:has-text("전문진료분야")');
    if (specialtyHeading) {
        const nextP = await specialtyHeading.evaluateHandle(el => el.nextElementSibling);
        if (nextP && await nextP.evaluate(el => el.tagName === 'P' && el.classList.contains('subj_t'))) {
            return await nextP.evaluate(el => el.innerText.trim());
        } else if (nextP && await nextP.evaluate(el => el.tagName === 'DIV' && el.classList.contains('doc_txt_area'))) {
            // Handle case where specialty is inside a div.doc_txt_area for mobile view
            const mobileSpecialtyP = await nextP.$('p.subj_t');
            if (mobileSpecialtyP) {
                return await mobileSpecialtyP.evaluate(el => el.innerText.trim());
            }
        }
    }
    return '';
};


async function parse(url) {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Scrape 1st page of papers
        const paperTitles = [];
        try {
            const moreButton = page.getByRole('button', { name: '더보기' });
            await moreButton.waitFor({ state: 'visible', timeout: 5000 });
            await moreButton.click();
            await page.waitForSelector('ul#_thesisContainer', { state: 'visible', timeout: 5000 });
            const titlesOnPage = await page.locator('ul#_thesisContainer li._thesisIem span[data-key="thesisNm"]').allTextContents();
            paperTitles.push(...titlesOnPage.map(t => t.trim().replace(/"/g, "'")).filter(t => t));
        } catch (e) {
            console.error(`Could not scrape papers: ${e.message}`);
        }

        // --- NEW: Extract specialty, education, experience, profileUrl outside page.evaluate ---
        const specialty = await findSpecialty(page);
        const education = await findSectionData('학력', page);
        const experience = await findSectionData('경력', page);
        const profileUrl = await page.evaluate(() => document.querySelector('.doc_visual .doc_img')?.src || '');

        // Scrape other data
        const data = await page.evaluate((args) => {
            const { scrapedPapers, specialty, education, experience, profileUrl } = args;
            // 'activities' (학술) is still missing. Let's try to find it here.
            const findActivities = () => {
                const heading = Array.from(document.querySelectorAll('h3.cont_tit')).find(h => h.innerText.trim() === '학회활동');
                if (!heading || !heading.nextElementSibling) return [];
                return Array.from(heading.nextElementSibling.querySelectorAll('li')).map(item => ({ content: item.innerText.trim().replace(/"/g, "'") }));
            };
            const activities = findActivities();

            return {
                specialty,
                학력: education,
                경력: experience,
                논문: scrapedPapers.map(p => p.replace(/^\d+\.\s*/, '')), // Clean up numbering like "1. "
                학술: activities,
                profileUrl,
            };
        }, { scrapedPapers: paperTitles, specialty, education, experience, profileUrl });

        await browser.close();
        return { success: true, data };

    } catch (error) {
        await browser.close();
        console.error(`Error in schmc.ac.kr parser: ${error.message}`);
        return { success: false, error: error.message };
    }
}

if (require.main === module) {
    (async () => {
        const url = process.argv[2];
        if (!url) {
            console.error('Please provide a URL as an argument.');
            process.exit(1);
        }
        const result = await parse(url);
        if (result.success) {
            console.log(JSON.stringify(result.data, null, 2));
        }
    })();
}

module.exports = { parse };