
const { chromium } = require('playwright');
const cheerio = require('cheerio');
const url = require('url');

async function main() {
    const siteUrl = process.argv[2];
    if (!siteUrl) {
        console.error('Usage: node parser.js <url>');
        process.exit(1);
    }

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(siteUrl, { waitUntil: 'domcontentloaded' });

        const html = await page.content();
        const $ = cheerio.load(html);

        const extractedData = {};

        // Extract profile URL
        const profileImgSrc = $('div.part_popup_01 p img').attr('src');
        if (profileImgSrc) {
            extractedData.profileUrl = new url.URL(profileImgSrc, siteUrl).href;
        }

        // Extract specialty
        extractedData.specialty = $('dd.m02_01').text().trim();

        // Extract education and experience
        const historyHtml = $('table.table_a td').html();
        if (historyHtml) {
            const lines = historyHtml.split(/<br\s*\/?>/i).map(line => line.replace(/&nbsp;|　/g, ' ').trim()).filter(Boolean);
            
            const education = [];
            const experience = [];
            let currentCategory = null;

            lines.forEach(line => {
                if (line.startsWith('[학력]')) {
                    currentCategory = 'edu';
                    line = line.replace('[학력]', '').trim();
                } else if (line.startsWith('[경력]')) {
                    currentCategory = 'exp';
                    line = line.replace('[경력]', '').trim();
                }

                if (line) {
                    if (currentCategory === 'edu') {
                        education.push({ date: null, content: line });
                    } else if (currentCategory === 'exp') {
                        experience.push({ date: null, content: line });
                    }
                }
            });

            if (education.length > 0) extractedData.학력 = education;
            if (experience.length > 0) extractedData.경력 = experience;
        }
        
        console.log(JSON.stringify(extractedData, null, 2));

    } catch (error) {
        console.error('Error during parsing:', error);
        console.log(JSON.stringify({ error: error.message }));
    } finally {
        if (browser) await browser.close();
    }
}

main();
