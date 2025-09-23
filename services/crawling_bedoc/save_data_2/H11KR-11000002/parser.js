
const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const hospitalSite = process.argv[2];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
    const page = await context.newPage();

    let synthesizedData = {};
    let error = null;

    try {
        await page.goto(hospitalSite, { waitUntil: 'networkidle', timeout: 60000 });

        const moreButtonSelectors = [
            'div.cont_main_profile > div:has(> strong:contains("경력")) + .profile_view_more a',
            'div.cont_main_profile > div:has(> strong:contains("학회활동")) + .profile_view_more a',
            'div.cont_main_profile > div:has(> strong:contains("수상이력")) + .profile_view_more a',
            'div.thesis_list + .more_btn a',
            'div.book_list + .more_btn a',
            'div.news_list + .more_btn a'
        ];

        console.log("--- [DEBUG] '더보기' 버튼 클릭 시작 ---");
        for (const selector of moreButtonSelectors) {
            let clickCount = 0;
            while (true) {
                const moreButton = page.locator(selector).first();
                if (await moreButton.count() === 0 || !await moreButton.isVisible()) {
                    if (clickCount > 0) {
                        console.log(`[DEBUG] 선택자 '${selector}'의 버튼이 ${clickCount}번 클릭 후 더 이상 보이지 않습니다.`);
                    } else {
                        // console.log(`[DEBUG] 선택자 '${selector}'에 해당하는 버튼을 찾을 수 없거나 보이지 않습니다.`);
                    }
                    break;
                }
                
                console.log(`[DEBUG] 클릭 시도: '${selector}'`);
                let res = await moreButton.click({ force: true, timeout: 2000 }).catch((e) => {
                    console.log(`[DEBUG] 클릭 중 오류 발생 (버튼 사라짐 추정), 루프 중단. 오류: ${e.message}`);
                    return 'break';
                });

                if (res === 'break') break;
                clickCount++;
                console.log(`[DEBUG] 클릭 ${clickCount}회 성공.`);
                await page.waitForTimeout(1000); // 컨텐츠 로딩 대기
            }
        }
        console.log("--- [DEBUG] '더보기' 버튼 클릭 완료 ---");

        const html = await page.content();
        const $ = cheerio.load(html);

        // --- Parse all data from the fully expanded page ---

        synthesizedData.profileUrl = new URL($('div.cont_bg[data-img-1]').data('img-1'), hospitalSite).href;
        synthesizedData.specialty = $('dt:contains("진료분야")').first().parent().find('dd p').text().trim();

        const parseProfileSection = (title) => {
            const items = [];
            $(`div.cont_main_profile > div > strong:contains('${title}')`).parent().find('ul > li').each((i, el) => {
                const date = $(el).find('dt').text().trim().replace(/\s+~\s+/, ' ~ ');
                const content = $(el).find('dd').text().trim();
                if(date || content) items.push({ date: date || null, content: content.replace(/"/g, '') });
            });
            return items;
        };

        synthesizedData.학력 = parseProfileSection('학력');
        synthesizedData.경력 = parseProfileSection('경력');
        synthesizedData.수상 = parseProfileSection('수상이력');
        synthesizedData.학술 = parseProfileSection('학회활동');

        synthesizedData.논문 = [];
        $('div.thesis_list ul > li').each((i, el) => {
            const year = $(el).find('.date_wrap .f_eng').first().text().trim();
            const month = $(el).find('.date_wrap em[title]').attr('title');
            const journal = $(el).find('.info .public').text().trim();
            const authorType = $(el).find('.info .author').text().trim();
            const title = $(el).find('.title p').text().trim();
            if (title) {
                let fullText = `${title.replace(/"/g, '')} (${journal}`;
                if (year) fullText += `, ${year}년`;
                if (month) fullText += ` ${month}월`;
                if (authorType) fullText += `, ${authorType}`;
                fullText += `)`
                synthesizedData.논문.push(fullText);
            }
        });

        synthesizedData.저서 = [];
        $('div.book_list ul > li').each((i, el) => {
            const title = $(el).find('.title p').text().trim();
            const info = $(el).find('.info').text().trim();
            synthesizedData.저서.push({ date: null, content: `${title.replace(/"/g, '')} (${info})`, issuer: null });
        });

        synthesizedData.언론 = [];
        $('div.news_list div.grid-item').each((i, el) => {
            const date = $(el).find('.date').text().trim();
            const text = $(el).find('.cont_wrap p').text().trim();
            const url = $(el).find('a').first().attr('href');
            if (text) {
                 synthesizedData.언론.push({ targetDate: date, type: '뉴스', text: text.replace(/"/g, ''), url: new URL(url, hospitalSite).href });
            }
        });

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        error = e.stack;
        console.error(`Error during parsing for ${hospitalSite}:`, error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
