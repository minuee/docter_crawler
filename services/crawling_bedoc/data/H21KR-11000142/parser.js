const { chromium } = require('playwright');

// 이 파서는 서울양병원(yangh.co.kr) 사이트 구조에 특화되어 있습니다.
async function parse(url) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const data = await page.evaluate(() => {
            const getList = (selector) => Array.from(document.querySelectorAll(selector))
                                     .map(el => el.innerText.trim().replace(/"/g, ''))
                                     .filter(item => item); // Filter out empty strings

            const getListFromNextUl = (titleText) => {
                const allTitles = document.querySelectorAll('p.his-title');
                for (const titleEl of allTitles) {
                    if (titleEl.innerText.trim() === titleText) {
                        const ul = titleEl.nextElementSibling;
                        if (ul && ul.tagName === 'UL' && ul.classList.contains('ul-dot')) {
                            return Array.from(ul.querySelectorAll('li'))
                                        .map(li => li.innerText.trim().replace(/"/g, ''))
                                        .filter(item => item);
                        }
                    }
                }
                return [];
            };

            const specialty = document.querySelector('.field > span')?.innerText.trim().replace(/"/g, '') || '';
            
            const education = getListFromNextUl('학력');
            const experience = getListFromNextUl('경력사항');
            const activities = getList('#tab-3 ul li');
            const publicationsRaw = getList('#tab-4 ul li');

            let profileUrl = '';
            const bgImageStyle = document.querySelector('span.bg.bg1')?.style.backgroundImage;
            if (bgImageStyle) {
                profileUrl = bgImageStyle.slice(4, -1).replace(/[""]/g, "");
            }

            const books = [];
            const papers = [];
            let isBookSection = false;
            let isPaperSection = false;

            publicationsRaw.forEach(item => {
                if (item.includes('저서')) {
                    isBookSection = true;
                    isPaperSection = false;
                    return;
                }
                if (item.includes('논문')) {
                    isBookSection = false;
                    isPaperSection = true;
                    return;
                }
                if (isBookSection) books.push(item);
                if (isPaperSection) papers.push(item);
            });

            return {
                specialty,
                학력: education.map(item => ({ content: item })),
                경력: experience.map(item => ({ content: item })),
                논문: papers,
                저서: books,
                학술: activities.map(item => ({ content: item })),
                profileUrl: profileUrl ? `https://www.yangh.co.kr${profileUrl}` : ''
            };
        });

        await browser.close();
        return { success: true, data };

    } catch (error) {
        await browser.close();
        console.error(`Error in yangh.co.kr parser: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// 이 파일이 직접 실행될 경우를 위한 로직
if (require.main === module) {
    (async () => {
        const url = process.argv[2];
        if (!url) {
            console.error('Please provide a URL as an argument.');
            process.exit(1);
        }
        const result = await parse(url);
        if (result.success) {
            console.log(JSON.stringify(result.data, null, 2));
        }
    })();
}

module.exports = { parse };
