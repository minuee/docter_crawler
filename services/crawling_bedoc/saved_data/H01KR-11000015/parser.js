const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, site_type } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let extractedHtml = null;
    let isAttend = false;
    let error = null;
    let parsedDetails = {}; // Object to store parsed details

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        const doctorName = doctorData.bedoc_doctorname;
        let contentPage = page;

        const rawHtml = await contentPage.content();
        // console.log(rawHtml); // Log raw HTML for debugging
        const $ = cheerio.load(rawHtml);

        // Remove unwanted elements before extracting body HTML
        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(doctorName)) {
            isAttend = true;
        }

        // --- Start of detailed parsing logic ---

        // Helper function to extract list items with date and content
        const extractListItems = ($, selector) => {
            const items = [];
            $(selector).each((i, el) => {
                const text = $(el).text().trim();
                // Attempt to parse date and content. This is a generic approach.
                // Real-world parsing would need more specific selectors/regex.
                const match = text.match(/^(\d{4}(?: ~ \d{4})?|\d{4}\.\d{2}\.\d{2})?\s*(.*)$/);
                if (match) {
                    items.push({
                        date: match[1] || null,
                        content: match[2].replace(/"/g, '') // Remove double quotes
                    });
                } else {
                    items.push({ date: null, content: text.replace(/"/g, '') }); // Remove double quotes
                }
            });
            return items;
        };

        // Helper function to extract simple list of strings
        const extractSimpleList = ($, selector) => {
            const items = [];
            $(selector).each((i, el) => {
                items.push($(el).text().trim().replace(/"/g, '')); // Remove double quotes
            });
            return items;
        };

        // Extract Profile URL
        const profileImgSrc = $('.profile .photo img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
        }

        // Extract Specialty (assuming it's near the doctor's name or in a specific tag)
        // This is a very generic selector, might need refinement
        parsedDetails.specialty = $('.info p').first().text().trim();

        // Extract 학력 (Education)
        parsedDetails.학력 = extractListItems($, '#tab-info01 .list li'); // Assuming a common structure

        // Extract 경력 (Experience)
        parsedDetails.경력 = extractListItems($, '#tab-info01 .list li'); // Assuming a common structure

        // Extract 수상 (Awards)
        parsedDetails.수상 = extractListItems($, '#tab-info01 .list li'); // Assuming a common structure

        // Extract 학술 (Academic Activities)
        parsedDetails.학술 = extractListItems($, '#tab-info01 .list li'); // Assuming a common structure

        // Extract 언론 (Media Coverage)
        const mediaItems = [];
        $('#pressList li').each((i, el) => {
            const link = $(el).find('a');
            const text = link.text().trim();
            const url = link.attr('href');
            const date = $(el).find('span').text().trim(); // Assuming date is in a span
            // Further parsing of 'type' and 'issuer' from 'text' might be needed
            mediaItems.push({
                targetDate: date || null,
                type: null, // Needs more specific parsing from text
                text: text.replace(/"/g, ''), // Remove double quotes
                url: url || null,
                issuer: null // Needs more specific parsing from text
            });
        });
        parsedDetails.언론 = mediaItems;

        // Extract 저서 (Books)
        parsedDetails.저서 = extractSimpleList($, '#tab-info02 .list li'); // Assuming a common structure

        // Extract 논문 (Theses/Papers)
        parsedDetails.논문 = extractSimpleList($, '#tab-info02 .list li'); // Assuming a common structure

        // --- End of detailed parsing logic ---

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    // Merge parsedDetails into the final output
    console.log(JSON.stringify({
        htmlContent: extractedHtml,
        isAttend: isAttend,
        error: error,
        ...parsedDetails // Add all parsed details here
    }));
})();