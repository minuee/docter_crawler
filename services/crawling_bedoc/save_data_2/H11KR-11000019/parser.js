const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/53.36'
    });
    const page = await context.newPage();

    let error = null;
    let parsedDetails = {
        isAttend: false,
        profileUrl: null,
        specialty: null,
        "학력": [], "경력": [], "학술": [], "수상": [], "저서": [], "논문": [], "언론": []
    };

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        let $ = cheerio.load(await page.content());

        if ($('body').text().includes(bedoc_doctorname)) parsedDetails.isAttend = true;

        const profileImgSrc = $('.doc_photo img').attr('src') || $('.doc_img_wrap img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, "http://www.brmh.org").href;
        }

        let specialty = $("th:contains('진료분야')").next('td').text().trim().replace(/[\n\t]/g, ' ').replace(/\s+/g, ' ');
        if (!specialty) specialty = $("dt.active").next('dd').text().trim();
        parsedDetails.specialty = specialty;

        let currentKey = null;
        $('#box_area2 .doctor_bott_cont > div').each((i, el) => {
            const element = $(el);
            if (element.hasClass('doc_cont_tit')) {
                const title = element.text().trim();
                switch (title) {
                    case '학력': currentKey = '학력'; break;
                    case '경력': case '해외연수': currentKey = '경력'; break;
                    case '학회활동': currentKey = '학술'; break;
                    case '수상경력': currentKey = '수상'; break;
                    case '저서': currentKey = '저서'; break;
                    default: currentKey = null;
                }
            } else if (element.hasClass('doc_cont_line') && currentKey) {
                const content = element.text().trim().replace(/"/g, '');
                if (content) {
                    const item = { date: null, content: content };
                    if (currentKey === '저서') item.issuer = null;
                    if (!parsedDetails[currentKey].some(existing => existing.content === item.content)) {
                        parsedDetails[currentKey].push(item);
                    }
                }
            }
        });

        async function handleTabPagination(tabClickSelector, contentSelector, itemSelector, paginationSelector, dataKey, parseFn) {
            await page.click(tabClickSelector);
            await page.waitForTimeout(1500);

            while (true) {
                const initialContent = await page.innerHTML(contentSelector);
                const contentHtml = await page.content();
                const $$ = cheerio.load(contentHtml);

                $$(contentSelector).find(itemSelector).each((i, el) => {
                    const item = parseFn($$, el);
                    if (item && !JSON.stringify(parsedDetails[dataKey]).includes(JSON.stringify(item))) {
                        parsedDetails[dataKey].push(item);
                    }
                });
                
                let nextButton = await page.$(paginationSelector + ' li.on + li a');
                if (!nextButton) nextButton = await page.$(paginationSelector + ' a.btn_next');

                if (nextButton) {
                    await nextButton.click();
                    try {
                        await page.waitForFunction(
                            (selector, initial) => document.querySelector(selector).innerHTML !== initial,
                            { selector: contentSelector, initial: initialContent },
                            { timeout: 10000 }
                        );
                         await page.waitForTimeout(500);
                    } catch (e) {
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        await handleTabPagination('li#box_tab3 a', '#box_area3 tbody#brisTbody', 'tr', 'div#pageList', '논문', ($, el) => {
            const td = $(el).find('td');
            const title = td.find('a.tit').text().trim();
            const journal = td.find('span.from').text().trim();
            const yearAndMonth = td.find('span.date').text().trim();
            if (title) {
                return `${title} (${journal}, ${yearAndMonth})`;
            }
            return null;
        });

        await handleTabPagination('li#box_tab4 a', '#box_area4 ul#linkUl', 'li a.border_box', 'div#pageLinkList', '언론', ($$, el) => {
            const link = $$(el);
            const targetDate = link.find('.b_date').text().trim();
            const issuer = link.find('.b_media').text().trim();
            const text = link.find('.b_title').text().trim();
            let urlAttr = link.attr('onclick') || link.attr('href');
            if (text && urlAttr) {
                let finalUrl = urlAttr.startsWith('javascript:') ? (urlAttr.match(/(http[^']*)/) || [])[1] || null : urlAttr;
                return { targetDate: targetDate || null, type: '기사', text: text.replace(/"/g, ''), url: finalUrl, issuer: issuer || null };
            }
            return null;
        });

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
        console.error(e.stack);
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    for (const key in parsedDetails) {
        if (Array.isArray(parsedDetails[key]) && parsedDetails[key].length === 0) {
            delete parsedDetails[key];
        }
    }

    console.log(JSON.stringify(parsedDetails, null, 2));

})();