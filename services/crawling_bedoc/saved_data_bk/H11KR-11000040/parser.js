const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname, site_type, bedoc_hospitalsite } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    let page = await context.newPage();

    let extractedHtml = null;
    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });

        // --- Start of "더보기" button handling (generic) ---
        const clickMoreButtons = async (currentPage) => {
            const maxClicks = 10; // Limit to prevent infinite loops
            let clickedCount = 0;
            let buttonFound = true;

            while (buttonFound && clickedCount < maxClicks) {
                buttonFound = false;
                const moreButton = await currentPage.$('button:has-text("더보기")') ||
                                   await currentPage.$('a:has-text("더보기")') ||
                                   await currentPage.$('button:has-text("더보기 +")') ||
                                   await currentPage.$('a:has-text("더보기 +")');

                if (moreButton) {
                    try {
                        await moreButton.click();
                        await currentPage.waitForTimeout(1000); // Wait for content to load
                        clickedCount++;
                        buttonFound = true;
                    } catch (clickError) {
                        console.log(`Could not click more button: ${clickError.message}`);
                        buttonFound = false;
                    }
                }
            }
        };
        // --- End of "더보기" button handling ---

        await clickMoreButtons(page); // Click more buttons on the main page

        let rawHtml = await page.content();
        let $ = cheerio.load(rawHtml);

        // Sanitize HTML (remove scripts, styles, etc.)
        $('script, style, nav, header, footer, iframe, noscript').remove();
        extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        // --- Detailed parsing logic for Kangnam Hallym Hospital ---
        // Extract Profile URL
        const profileImgSrc = $('article.pic img').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        // Extract Specialty
        parsedDetails.specialty = $('div.denti p').text().trim().replace(/"/g, '');

        // Extract 학력
        parsedDetails.학력 = [];
        $('h4:contains("학력") + table td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const dateMatch = $(el).find('span').eq(0).text().trim();
                const contentMatch = $(el).find('span').eq(1).text().trim();
                parsedDetails.학력.push({
                    date: dateMatch || null,
                    content: contentMatch.replace(/"/g, '') || text.replace(/"/g, '')
                });
            }
        });

        // Extract 경력
        parsedDetails.경력 = [];
        $('h4:contains("경력") + table td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const dateMatch = $(el).find('span').eq(0).text().trim();
                const contentMatch = $(el).find('span').eq(1).text().trim();
                parsedDetails.경력.push({
                    date: dateMatch || null,
                    content: contentMatch.replace(/"/g, '') || text.replace(/"/g, '')
                });
            }
        });

        // Extract 학술
        parsedDetails.학술 = [];
        $('h4:contains("학회활동") + table td p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const dateMatch = $(el).find('span').eq(0).text().trim();
                const contentMatch = $(el).find('span').eq(1).text().trim();
                parsedDetails.학술.push({
                    date: dateMatch || null,
                    content: contentMatch.replace(/"/g, '') || text.replace(/"/g, '')
                });
            }
        });

        // Extract 수상
        parsedDetails.수상 = [];
        $('h4:contains("수상이력") + table td.dw-02 p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) {
                const dateMatch = $(el).find('span').eq(0).text().trim();
                const contentMatch = $(el).find('span').eq(1).text().trim();
                parsedDetails.수상.push({
                    date: dateMatch || null,
                    content: contentMatch.replace(/"/g, '') || text.replace(/"/g, '')
                });
            }
        });

        // Extract 논문 (from tab_con02)
        parsedDetails.논문 = [];
        parsedDetails.저서 = []; // 저서도 여기서 함께 처리
        try {
            const thesisTab = await page.$('a[href="#tab_con02"]');
            if (thesisTab) {
                await thesisTab.click();
                await page.waitForSelector('#tab_con02.active', { state: 'visible', timeout: 10000 });
                await page.waitForTimeout(1000); // 추가 대기

                const thesisContentHtml = await page.$eval('#tab_con02 div.thesis_list', el => el.innerHTML);
                const $thesis = cheerio.load(thesisContentHtml);

                $thesis('br').replaceWith('\n'); // <br> 태그를 줄바꿈 문자로 대체
                const thesisText = $thesis.text().trim();
                if (thesisText) {
                    // "◎ 국내학회지 발표논문" 또는 "◎ 저서/저술내용 숨기기" 등으로 시작하는 부분을 분리
                    const sections = thesisText.split(/◎\s*(국내학회지 발표논문|저서\/저술내용 숨기기)/).filter(s => s.trim() !== '');
                    sections.forEach((section, index) => {
                        if (section.includes('국내학회지 발표논문')) {
                            const papers = sections[index + 1].split('\n').map(p => p.trim()).filter(p => p !== '');
                            parsedDetails.논문.push(...papers.map(p => p.replace(/"/g, '')));
                        } else if (section.includes('저서/저술내용 숨기기')) {
                            const books = sections[index + 1].split('\n').map(b => b.trim()).filter(b => b !== '');
                            parsedDetails.저서 = books.map(b => ({ date: null, content: b.replace(/"/g, ''), issuer: null }));
                        }
                    });
                }
            }
        } catch (tabError) {
            console.log(`Error handling thesis tab: ${tabError.message}`);
        }

        // 언론 필드 파싱 로직 제거 (사용자 요청)
        parsedDetails.언론 = [];


        // Initialize other fields as empty arrays if not found
        if (!parsedDetails.언론) parsedDetails.언론 = [];
        if (!parsedDetails.저서) parsedDetails.저서 = [];
        if (!parsedDetails.논문) parsedDetails.논문 = [];


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
