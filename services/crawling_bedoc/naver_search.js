const { chromium } = require('playwright');
const fs = require('fs');

async function getNaverHtmlAndLinks(query, page = 1) {
    const start = (page - 1) * 15 + 1; // Naver는 start 파라미터로 페이지를 제어 (1페이지: 1, 2페이지: 16, ...)
    const searchUrl = `https://search.naver.com/search.naver?where=web&query=${encodeURIComponent(query)}&sm=tab_pge&start=${start}`;
    
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const playwrightPage = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
        
        console.log(`[NaverSearch] Navigating to ${searchUrl} for query: ${query}`);
        await playwrightPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

        const htmlContent = await playwrightPage.content(); // Get full page HTML

        const linksData = await playwrightPage.$$eval('#content.pack_group a', anchors => {
            return anchors.map(a => ({
                href: a.href,
                text: a.textContent.trim()
            }));
        });

        console.log(`[NaverSearch] Successfully fetched HTML and links for query: ${query}`);
        return { htmlContent, linksData };
    } catch (error) {
        console.error(`[NaverSearch] Error fetching HTML and links for query "${query}": ${error.message}`);
        return { htmlContent: null, linksData: null };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    getNaverHtmlAndLinks
};