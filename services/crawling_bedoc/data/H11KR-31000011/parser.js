const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const $ = cheerio.load(html);

        const synthesizedData = {
            "학력": [],
            "경력": [],
            "학술": [],
            "논문": [],
            "수상": [],
            "저서": [],
            "언론": []
        };

        const profileImgSrc = $('.left .photo img').attr('src');
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
        }

        const detailInfo = $('.right .detail_info dl.text_con');

        const extractBrSeparatedList = (title) => {
            const items = [];
            const dd = detailInfo.find(`dt:contains('${title}')`).next('dd');
            const htmlContent = dd.html();
            if (htmlContent) {
                htmlContent.split(/<br>|\n/).forEach(line => {
                    const cleanedContent = line.replace(/<[^>]*>/g, '').trim().replace(/"/g, '');
                    if (cleanedContent) {
                        items.push({ date: null, content: cleanedContent });
                    }
                });
            }
            return items;
        };
        
        synthesizedData.specialty = detailInfo.find(`dt:contains('주요진료분야')`).next('dd').text().trim().replace(/"/g, '');
        synthesizedData.경력 = extractBrSeparatedList('주요경력');
        synthesizedData.학력 = extractBrSeparatedList('주요학력 및 수련');

        const academicActivities = [];
        const activityDd = detailInfo.find(`dt:contains('학회활동')`).next('dd');
        activityDd.find('div, p').each((i, el) => {
            const activityText = $(el).text().trim().replace(/"/g, '');
            if(activityText) {
                academicActivities.push({ date: null, content: activityText });
            }
        });
        synthesizedData.학술 = academicActivities;


        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
