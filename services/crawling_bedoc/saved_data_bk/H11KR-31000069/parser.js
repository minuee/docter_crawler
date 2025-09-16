const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Define findSectionData and findSpecialty outside parse function


const findSpecialty = async (page) => {
    const specialtyTitle = await page.$('p.title:has-text("전문분야")');
    if (specialtyTitle) {
        const explainTextDiv = await specialtyTitle.evaluateHandle(el => el.closest('.special').querySelector('.special_explain'));
        if (explainTextDiv) {
            return await explainTextDiv.evaluate(el => el.innerText.trim());
        }
    }
    return '';
};

const extractCurriSection = async (page, titleText) => {
    const sectionDiv = await page.$(`div.list:has(p.curri_title:has-text("${titleText}"))`);
    if (sectionDiv) {
        const listItems = await sectionDiv.$$eval('ul.dot_list li', (elements) => { // Fixed: $$eval
            return elements.map(el => el.innerText.trim().replace(/"/g, "'")).filter(text => text); // Fixed: replace
        });
        return listItems;
    }
    return [];
};

const extractSubSection = async (page, parentTitleText, subTitleText) => {
    const parentSectionDiv = await page.$(`div.curri_section:has(p.curri_title:has-text("${parentTitleText}"))`);
    if (parentSectionDiv) {
        const subTitleElement = await parentSectionDiv.$(`p.curri_title:has-text("${subTitleText}")`);
        if (subTitleElement) {
            const listContainer = await subTitleElement.evaluateHandle(el => el.nextElementSibling);
            if (listContainer && await listContainer.evaluate(el => el.tagName === 'UL')) { // Ensure it's a UL
                const listItems = await listContainer.evaluate((ulElement) => {
                    return Array.from(ulElement.querySelectorAll('li')).map(el => el.innerText.trim().replace(/"/g, "'")).filter(text => text);
                });
                return listItems;
            }
        }
    }
    return [];
};

const extractBooksFromAcademicSection = async (page, parentTitleText) => {
    const parentSectionDiv = await page.$(`div.curri_section:has(p.curri_title:has-text("${parentTitleText}"))`);
    if (parentSectionDiv) {
        const booksTitle = await parentSectionDiv.$('p.curri_title:has-text("저서")');
        if (booksTitle) {
            const booksList = await booksTitle.evaluateHandle(el => el.nextElementSibling);
            if (booksList && await booksList.evaluate(el => el.tagName === 'UL')) { // Ensure it's a UL
                const listItems = await booksList.evaluate((ulElement) => {
                    return Array.from(ulElement.querySelectorAll('li')).map(el => el.innerText.trim().replace(/"/g, "'")).filter(text => text);
                });
                return listItems;
            }
        }
    }
    return [];
};


async function parse(url) {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Scrape papers
        const paperTitles = [];
        try {
            // Wait for the "논문" tab to be active and content to be visible
            await page.click('ul.news_tab li[rel="paper"]'); // Click the "논문" tab
            await page.waitForSelector('div#paper ol.thesisList li', { state: 'visible', timeout: 10000 }); // Wait for thesis list items

            const titlesOnPage = await page.$$eval('div#paper ol.thesisList li', (elements) => { // Fixed: $$eval
                return elements.map(el => el.innerText.trim().replace(/"/g, "'")).filter(text => text); // Fixed: replace
            });
            paperTitles.push(...titlesOnPage);

            // Check for "더보기" button for papers and click if available
            try {
                const moreButton = page.locator('div#paper .thesisBtn'); // Assuming thesisBtn is the "더보기" for papers
                if (await moreButton.isVisible()) {
                    await moreButton.click();
                    await page.waitForTimeout(1000); // Small wait for content to load after click
                    const additionalTitles = await page.$$eval('div#paper ol.thesisList li', (elements) => { // Fixed: $$eval
                        return elements.map(el => el.innerText.trim().replace(/"/g, "'")).filter(text => text); // Fixed: replace
                    });
                    paperTitles.push(...additionalTitles);
                }
            } catch (e) {
                console.log(`No additional paper "더보기" button found or clickable: ${e.message}`);
            }

        } catch (e) {
            console.error(`Could not scrape papers: ${e.message}`);
        }

        // --- NEW: Extract specialty, education, experience, profileUrl outside page.evaluate ---
        const specialty = await findSpecialty(page);
        const professorExperience = await extractCurriSection(page, '교수 경력');
        const clinicalExperience = await extractCurriSection(page, '진료 경력');

        let education = [];
        let experience = [];
        let academicActivities = [];
        let books = [];

        // Combine professor and clinical experience into 경력
        experience = [...professorExperience, ...clinicalExperience].map(content => ({ content }));

        // Extract data from "학회/연구/Postdoctorial Fellowship/수상경력" section
        const academicSectionDiv = await page.$(`div.curri_section:has(p.curri_title:has-text("학회/연구/Postdoctorial Fellowship/수상경력"))`);
        if (academicSectionDiv) {
            const academicListItems = await academicSectionDiv.$eval('div.list > ul.dot_list li', (elements) => {
                return elements.map(el => el.innerText.trim().replace(/"/g, "'")).filter(text => text);
            });

            // Categorize items from academicListItems
            academicListItems.forEach(item => {
                if (item.includes('학사') || item.includes('석사') || item.includes('박사') || item.includes('졸업')) {
                    education.push({ content: item });
                } else if (item.includes('학회')) {
                    academicActivities.push({ content: item });
                } else if (item.includes('연구')) {
                    academicActivities.push({ content: item });
                } else if (item.includes('Postdoctorial Fellowship')) {
                    experience.push({ content: item }); // Treat as experience
                } else if (item.includes('저서')) {
                    books.push({ content: item });
                } else {
                    // Default to academic activities if not explicitly categorized
                    academicActivities.push({ content: item });
                }
            });
        }

        const profileUrl = null; // Explicitly set profileUrl to null as it's a placeholder

        // Scrape other data
        const data = await page.evaluate((dataToPass) => {
            const { scrapedPapers, specialty, education, experience, academicActivities, books, profileUrl } = dataToPass;
            return {
                specialty,
                학력: education,
                경력: experience,
                논문: scrapedPapers.map(p => p.replace(/^\d+\.\s*/, '')), // Clean up numbering like "1. "
                학술: academicActivities,
                저서: books,
                profileUrl,
            };
        }, { scrapedPapers: paperTitles, specialty, education, experience, academicActivities, books, profileUrl });

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