const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        // Remove unnecessary elements
        $('script, style, nav, header, footer, iframe, noscript').remove();
        const extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic for 인천세종병원 (Corrected) ---

        // Extract Profile URL
        const profileImgSrc = $('div.doctor_img div.inner img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        // Extract Specialty
        parsedDetails.specialty = $('div.d_subject > p.f_20.txc_bk').text().trim();

        // Helper to process sections split by <br>
        const processBrSeparatedList = (element) => {
            const items = [];
            const html = $(element).html();
            if (!html) return items;
            html.split('<br>').forEach(line => {
                const content = $(`<div>${line}</div>`).text().trim();
                if (content) {
                    items.push({ date: null, content: content.replace(/"/g, '') });
                }
            });
            return items;
        };

        // Extract 학력, 경력, 수상, 논문 from the first tab
        $('div#tab1 p.f_20.fw_700.txc_bk').each((i, el) => {
            const title = $(el).text().trim();
            const listElement = $(el).next('ul');

            if (title === '학력') {
                parsedDetails.학력 = processBrSeparatedList(listElement);
            } else if (title === '주요경력') {
                parsedDetails.경력 = processBrSeparatedList(listElement);
            } else if (title === '수상내역') {
                parsedDetails.수상 = processBrSeparatedList(listElement);
            } else if (title === '주요논문') {
                const papers = [];
                listElement.find('li').each((j, li) => {
                    const paperText = $(li).text().trim().replace(/"/g, '');
                    if(paperText) papers.push(paperText);
                });
                parsedDetails.논문 = papers;
            }
        });

        // Extract 언론보도 from the second tab
        const mediaItems = [];
        $('div#tab2 ul li a').each((i, el) => {
            const text = $(el).text().trim().replace(/"/g, '');
            const url = $(el).attr('href');
            let issuer = null;
            const match = text.match(/\s*\[(.*?)\]/);
            if (match) {
                issuer = match[1];
            }
            mediaItems.push({
                targetDate: null,
                type: '기사',
                text: text,
                url: url,
                issuer: issuer
            });
        });
        if (mediaItems.length > 0) {
            parsedDetails.언론 = mediaItems;
        }


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