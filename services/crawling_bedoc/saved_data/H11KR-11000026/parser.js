const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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

        // Scrape all other data
        const data = await page.evaluate((scrapedPapers) => {
            const findSectionData = (title) => {
                const heading = Array.from(document.querySelectorAll('h4.tit')).find(h => h.innerText.trim() === title);
                if (!heading || !heading.nextElementSibling) return [];
                return Array.from(heading.nextElementSibling.querySelectorAll('li')).map(item => ({ content: item.innerText.trim().replace(/"/g, "'") }));
            };

            const findSpecialty = () => {
                const th = Array.from(document.querySelectorAll('th')).find(el => el.innerText.trim() === '진료분야');
                if (!th || !th.nextElementSibling) return '';
                return Array.from(th.nextElementSibling.querySelectorAll('li')).map(el => el.innerText.trim()).join(', ');
            };

            const specialty = findSpecialty();
            const education = findSectionData('학력');
            const experience = findSectionData('경력');
            const activities = findSectionData('학회활동');
            let profileUrl = document.querySelector('.doctor-detail-box .photo img')?.src || '';

            return {
                specialty,
                학력: education,
                경력: experience,
                논문: scrapedPapers.map(p => p.replace(/^\d+\.\s*/, '')), // Clean up numbering like "1. "
                학술: activities,
                profileUrl,
            };
        }, paperTitles);

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