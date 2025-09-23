
const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {};
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // Click all "more" buttons within the section.
        const moreButtons = page.locator('div.section03 div.linebutton > a.btn');
        const count = await moreButtons.count();
        for (let i = 0; i < count; i++) {
            const button = moreButtons.nth(i);
            if (await button.isVisible()) {
                await button.click();
                await page.waitForTimeout(300);
            }
        }

        const html = await page.content();
        const $ = cheerio.load(html);

        synthesizedData.isAttend = true;
        
        const profileUrlSrc = $('div.doctor_img img').attr('src');
        if (profileUrlSrc) {
            synthesizedData.profileUrl = new URL(profileUrlSrc, hospital_site).href;
        }
        
        synthesizedData.specialty = $('li.field_contents').first().text().trim();

        const getTextFromRows = (selector) => {
            const items = [];
            $(selector).find('tbody tr').each((i, el) => {
                const date = $(el).find('th').text().trim();
                const content = $(el).find('td').text().trim();
                if (date || content) {
                    if(content !== '조회된 국내경력이 없습니다. ' && content !== '조회된 국외경력이 없습니다. '){
                        items.push({ date: date || null, content: content.replace(/"/g, '') });
                    }
                }
            });
            return items;
        };

        synthesizedData.학력 = getTextFromRows($('p.info_tit:contains("학력")').next('.doc_info01_table'));

        const tabContainers = $('div.section02 div.tab_cont > ul > li');
        synthesizedData.경력 = getTextFromRows($(tabContainers[0]).find('.doc_info01_table'));
        synthesizedData.학술 = getTextFromRows($(tabContainers[1]).find('.doc_info01_table'));
        
        const paperContainers = $('div.section03 div.tab_cont > ul > li');
        synthesizedData.논문 = getTextFromRows($(paperContainers[0]).find('.doc_info01_table')).map(item => {
            return `${item.content} (${item.date})`;
        });
        synthesizedData.저서 = getTextFromRows($(paperContainers[1]).find('.doc_info01_table'));

        synthesizedData.수상 = getTextFromRows($('p.info_tit:contains("수상")').next('.doc_info01_table.step02_2'));
        
        synthesizedData.언론 = [];
        const mediaContainers = $('div.section04 div.tab_cont > ul > li');
        $(mediaContainers[0]).find('tbody tr').each((i, el) => {
            const date = $(el).find('th').text().trim();
            const content = $(el).find('td a').text().trim();
            const url = $(el).find('td a').attr('href');
            if(content) synthesizedData.언론.push({targetDate: date, text: content.replace(/"/g, ''), url: url});
        });

    } catch (e) {
        error = e.stack;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...synthesizedData, error }, null, 2));
}

main();
