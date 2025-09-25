const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

async function main() {
    const jsonFilePath = process.argv[2];
    if (!jsonFilePath) {
        console.error('Usage: node parser.js <path_to_doctor_json_file>');
        process.exit(1);
    }

    let originalData;
    try {
        originalData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${jsonFilePath}`);
        process.exit(1);
    }

    const { hospital_site, bedoc_doctorname } = originalData;
    let browser;
    let parsedDetails = {};
    let isAttend = false;
    let error = null;

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
        const page = await context.newPage();

        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        $('script, style, nav, header, footer, iframe, noscript').remove();
        const extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        const doctorDetailStyle = $('.doctor_detail').attr('style');
        if (doctorDetailStyle) {
            const match = doctorDetailStyle.match(/url\(([^)]+)\)/);
            if (match && match[1]) {
                const relativeUrl = match[1].replace(/\\"/g, '');
                parsedDetails.profileUrl = new URL(relativeUrl, originalData.bedoc_hospitalsite).href;
            }
        }

        parsedDetails.specialty = $('p.professional_field').last().text().trim();

        const extractListItemsFromBr = (html) => {
            if (!html) return [];
            return html.split('<br>').map(item => ({ date: null, content: item.trim().replace(/"/g, '') })).filter(i => i.content);
        };
        const extractSimpleListFromBr = (html) => {
            if (!html) return [];
            return html.split('<br>').map(item => item.trim().replace(/"/g, '')).filter(Boolean);
        };

        $('.roadmap_scroll').each((i, el) => {
            const title = $(el).find('h3').text().trim();
            const contentHtml = $(el).find('p').html();
            if (contentHtml) {
                switch (title) {
                    case '학력': parsedDetails.학력 = extractListItemsFromBr(contentHtml); break;
                    case '경력': parsedDetails.경력 = extractListItemsFromBr(contentHtml); break;
                    case '연수': if (!parsedDetails.경력) parsedDetails.경력 = []; parsedDetails.경력.push(...extractListItemsFromBr(contentHtml)); break;
                    case '학회': parsedDetails.학술 = extractListItemsFromBr(contentHtml); break;
                    case '수상': parsedDetails.수상 = extractListItemsFromBr(contentHtml); break;
                    case '논문': parsedDetails.논문 = extractSimpleListFromBr(contentHtml); break;
                }
            }
        });
        
        const mediaItems = [];
        $('.movieList2 .indi_resume22 .ul1 li').each((i, el) => {
            const link = $(el).find('a');
            mediaItems.push({
                targetDate: null,
                type: $(el).find('.badge.rect').text().trim() || '기사',
                text: link.text().trim().replace(/"/g, ''),
                url: link.attr('href') || null,
                issuer: null
            });
        });
        if (mediaItems.length > 0) parsedDetails.언론 = mediaItems;

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        isAttend = false;
    } finally {
        if (browser) await browser.close();
    }

    const finalData = { ...originalData, ...parsedDetails, isAttend, error };
    finalData.isSearchType = error ? 'html_playwright_failed' : 'html_playwright';
    finalData.isExist = !error;

    Object.keys(finalData).forEach(key => {
        if (Array.isArray(finalData[key]) && finalData[key].length === 0) {
            delete finalData[key];
        }
    });

    fs.writeFileSync(jsonFilePath, JSON.stringify(finalData, null, 2), 'utf-8');
    console.log(`Successfully processed and updated: ${path.basename(jsonFilePath)}`);
}

main().catch(console.error);
