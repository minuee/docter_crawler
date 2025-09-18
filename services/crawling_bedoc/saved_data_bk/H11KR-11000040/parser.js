const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    let page = await context.newPage();

    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        // Sanitize HTML
        $('script, style, nav, header, footer, iframe, noscript').remove();
        const extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic for Kangnam Hallym Hospital (Updated) ---

        // Extract Profile URL
        const profileImgSrc = $('div.pic img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        // Extract Specialty
        parsedDetails.specialty = $('div.part_txt p').attr('title') || $('div.part_txt p').text().trim();
        parsedDetails.specialty = parsedDetails.specialty.replace(/"/g, '');

        // Extract 학력 from #tab_con01
        parsedDetails.학력 = [];
        $('#tab_con01 td.dw-02 p').each((i, el) => {
            const date = $(el).find('span').first().text().trim();
            const content = $(el).find('span').last().text().trim();
            if (content) {
                parsedDetails.학력.push({
                    date: date || null,
                    content: content.replace(/"/g, '')
                });
            }
        });

        // Extract 경력 from #tab_con02
        parsedDetails.경력 = [];
        $('#tab_con02 td p').each((i, el) => {
            const date = $(el).find('span').first().text().trim();
            const content = $(el).find('span').last().text().trim();
             if (content) {
                parsedDetails.경력.push({
                    date: date || null,
                    content: content.replace(/"/g, '')
                });
            }
        });

        // Extract 학술 from #tab_con03
        parsedDetails.학술 = [];
        $('#tab_con03 td p').each((i, el) => {
            const content = $(el).find('span').last().text().trim();
            if (content) {
                parsedDetails.학술.push({
                    date: null,
                    content: content.replace(/"/g, '')
                });
            }
        });
        
        // Extract 논문/저서 from #tab_con05
        parsedDetails.논문 = [];
        parsedDetails.저서 = [];
        const publicationsNode = $('#tab_con05 td');
        publicationsNode.find('br').replaceWith('\n');
        const publicationsText = publicationsNode.text().trim();
        const lines = publicationsText.split('\n').map(line => line.trim()).filter(line => line);

        lines.forEach(line => {
            // Remove the heading if it exists and add all lines to '논문'
            const cleanLine = line.replace('📌저서/저술', '').trim();
            if (cleanLine) {
                parsedDetails.논문.push(cleanLine.replace(/\"/g, ''));
            }
        });


        // Initialize other fields as empty arrays if not found
        if (!parsedDetails.수상) parsedDetails.수상 = [];
        if (!parsedDetails.언론) parsedDetails.언론 = [];


    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    console.log(JSON.stringify({
        isAttend: isAttend,
        error: error,
        ...parsedDetails
    }));
})();