const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const url = process.argv[2];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let theses = [];
    let error = null;

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        // Click the thesis tab to make sure everything is active
        await page.click('li#box_tab3 a');
        await page.waitForTimeout(2000); // Wait for any potential JS to initialize

        // Helper function to parse theses from the current page content
        const parseCurrentPage = async () => {
            const contentHtml = await page.content();
            const $$ = cheerio.load(contentHtml);
            $$('#box_area3 tbody#brisTbody tr').each((i, row) => {
                const tds = $$(row).find('td');
                if (tds.length > 1) {
                    const title = $$(tds[0]).text().trim();
                    const journal = $$(tds[1]).text().trim();
                    const year = $$(tds[2]).text().trim();
                    if (title) {
                        const fullText = `${title} (${journal}, ${year}년)`;
                        if (!theses.includes(fullText)) {
                           theses.push(fullText);
                        }
                    }
                }
            });
        };

        // --- Manual Pagination --- 

        // Page 1
        await parseCurrentPage();

        // Page 2
        await page.evaluate(() => paging.fn_GetListData('LayerMediteamReport', '2', '', '', 'R'));
        await page.waitForTimeout(2000);
        await parseCurrentPage();

        // Page 3
        await page.evaluate(() => paging.fn_GetListData('LayerMediteamReport', '3', '', '', 'R'));
        await page.waitForTimeout(2000);
        await parseCurrentPage();

        // Page 4
        await page.evaluate(() => paging.fn_GetListData('LayerMediteamReport', '4', '', '', 'R'));
        await page.waitForTimeout(2000);
        await parseCurrentPage();

        // Page 5
        await page.evaluate(() => paging.fn_GetListData('LayerMediteamReport', '5', '', '', 'R'));
        await page.waitForTimeout(2000);
        await parseCurrentPage();

        // Page 6 (using the next arrow's function)
        await page.evaluate(() => paging.fn_GetListData('LayerMediteamReport', '6', '', '', 'R'));
        await page.waitForTimeout(2000);
        await parseCurrentPage();

    } catch (e) {
        error = e.stack;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ "논문": theses, "error": error }, null, 2));
})();