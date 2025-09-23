const { chromium } = require('playwright');
const cheerio = require('cheerio');
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
        console.error('Failed to read or parse the JSON file.');
        process.exit(1);
    }

    const url = doctorData.hospital_site;
    if (!url) {
        console.error('URL not found in the JSON file.');
        process.exit(1);
    }

    console.log(`Navigating to ${url}...`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let success = false;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Page loaded. Getting content...');
        const html = await page.content();
        const $ = cheerio.load(html);
        console.log('HTML content loaded. Starting parsing...');

        const profileImgSrc = $('.image_area .img ul li').first().find('img').attr('src');
        synthesizedData.profileUrl = profileImgSrc ? new URL(profileImgSrc, url).href : null;
        console.log(`Profile URL: ${synthesizedData.profileUrl}`);

        synthesizedData.specialty = $("p.mteam_tit:contains('진료분야')").next('p.mteam_desc').text().trim().replace(/"/g, '');
        console.log(`Specialty: ${synthesizedData.specialty}`);

        const parseTableSection = (title) => {
            const items = [];
            $(`p.mteam_tit:contains('${title}')`).next('.mteam_table').find('tbody tr').each((i, el) => {
                const date = $(el).find('td').eq(0).text().trim();
                const content = $(el).find('td').eq(1).text().trim().replace(/"/g, '');
                if (content) {
                    items.push({ date: date || null, content });
                }
            });
            console.log(`Parsed ${title}: ${items.length} items`);
            return items;
        };

        synthesizedData.학력 = parseTableSection('학력사항');
        
        const experienceItems = parseTableSection('경력사항');
        synthesizedData.경력 = [];
        synthesizedData.학술 = [];
        experienceItems.forEach(item => {
            if (item.content.includes('학회')) {
                synthesizedData.학술.push(item);
            } else {
                synthesizedData.경력.push(item);
            }
        });

        synthesizedData.언론 = [];
        $("p.mteam_tit:contains('언론보도')").next('.mteam_bbs').find('ul li').each((i, el) => {
            const dateText = $(el).find('.date').text().trim();
            const dateMatch = dateText.match(/\d{4}-\d{2}-\d{2}/);
            const targetDate = dateMatch ? dateMatch[0] : null;
            const text = $(el).find('a.tit').text().trim().replace(/"/g, '');
            const itemUrl = $(el).find('a.tit').attr('href');
            const issuerMatch = dateText.match(/\/(.*?)\\.*/); 
            const issuer = issuerMatch ? issuerMatch[1].replace(/_.*$/, '') : null;
            if (text) {
                synthesizedData.언론.push({ targetDate, type: '기사', text, url: itemUrl ? new URL(itemUrl, url).href : null, issuer });
            }
        });
        console.log(`Parsed 언론: ${synthesizedData.언론.length} items`);

        synthesizedData.수상 = [];
        synthesizedData.논문 = [];
        synthesizedData.저서 = [];

        console.log('--- PARSED DATA ---');
        console.log(JSON.stringify(synthesizedData, null, 2));
        success = true;

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        synthesizedData.error = e.message;
    } finally {
        console.log('Closing browser...');
        await browser.close();
        console.log('Browser closed.');

        const finalData = { ...doctorData, ...synthesizedData };
        if (success && (finalData.학력.length > 0 || finalData.경력.length > 0)) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
        }
        
        fs.writeFileSync(jsonPath, JSON.stringify(finalData, null, 2));
        console.log(`File updated: ${jsonPath}`);
    }
})();
