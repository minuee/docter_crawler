
const { chromium } = require('playwright');
const cheerio = require('cheerio');

// Helper function to build the full URL
const getFullUrl = (base, relative) => {
    if (!relative || relative.startsWith('http')) return relative;
    return new URL(relative, base).href;
};

// Helper function to clean text
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const synthesizedData = {
        isAttend: false,
        profileUrl: null,
        specialty: null,
        학력: [],
        경력: [],
        수상: [],
        학술: [],
        논문: [],
    };
    let error = null;

    try {
        // 1. --- Initial Page (소개) ---
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });
        const mainPageContent = await page.content();
        const $main = cheerio.load(mainPageContent);

        if ($main('body').text().includes(bedoc_doctorname)) {
            synthesizedData.isAttend = true;
        }
        synthesizedData.profileUrl = getFullUrl(hospital_site, $main('#doctor .slidesjs-slide').attr('src'));
        let specialty_parts = [];
        $main('div.info dl').each((i, el) => {
            const dt = cleanText($main(el).find('dt').text());
            if (dt.includes('[전문분야]') || dt.includes('[전문진료]')) {
                specialty_parts.push(cleanText($main(el).find('dd').text()));
            }
        });
        synthesizedData.specialty = specialty_parts.join(', ');

        // 2. --- 약력 Page (History, Awards, Societies) ---
        const historyPageUrl = hospital_site.replace('clinic_doc_view01_01.jsp', 'clinic_doc_view01_02.jsp');
        await page.goto(historyPageUrl, { waitUntil: 'networkidle', timeout: 60000 });
        const historyPageContent = await page.content();
        const $history = cheerio.load(historyPageContent);

        const processedLists = new Set();

        $history('.contents .subtit_h4').each((i, el) => {
            const title = cleanText($history(el).text());
            const list = $history(el).next('ul');
            if (list.length === 0) return;

            const listHtml = $history.html(list);
            if (processedLists.has(listHtml)) return;

            if (title.includes('학력')) {
                list.find('li').each((j, item) => {
                    const text = cleanText($history(item).text());
                    const dateMatch = text.match(/^\d{4}/);
                    const date = dateMatch ? dateMatch[0] : null;
                    const content = text.replace(/^\d{4}\s*/, '');
                    if (content) synthesizedData.학력.push({ date, content });
                });
                processedLists.add(listHtml);
            } else if (title.includes('경력') && !title.includes('연수')) {
                list.find('li').each((j, item) => {
                    const text = cleanText($history(item).text());
                    const dateMatch = text.match(/^\d{4}\s*-\s*\d{4}/) || text.match(/^\d{4}/);
                    const date = dateMatch ? dateMatch[0] : null;
                    const content = text.replace(date, '').trim();
                    if (content) synthesizedData.경력.push({ date, content });
                });
                processedLists.add(listHtml);
            }
        });
        
        // Fallback for the affiliations/awards list which may not have a title
        $history('.contents ul').each((i, list) => {
            const listHtml = $history.html(list);
            if (processedLists.has(listHtml)) return; // Skip already processed lists

            const firstLiText = cleanText($history(list).find('li').first().text());
            // Heuristic: if it contains society names or awards, process it.
            if (firstLiText.includes('학회') || firstLiText.includes('위원') || firstLiText.includes('상')) {
                 $history(list).find('li').each((j, item) => {
                    const content = cleanText($history(item).text());
                    if (content.includes('상')) {
                        synthesizedData.수상.push({ date: null, content });
                    } else {
                        synthesizedData.학술.push({ date: null, content });
                    }
                });
            }
        });

        // 3. --- 연구 Page (Papers) ---
        const researchPageUrl = hospital_site.replace('clinic_doc_view01_01.jsp', 'clinic_doc_view01_05.jsp');
        await page.goto(researchPageUrl, { waitUntil: 'networkidle', timeout: 60000 });
        const researchPageContent = await page.content();
        const $research = cheerio.load(researchPageContent);

        // More robust selector for papers
        $research('.contents ul li').each((i, el) => {
            const text = cleanText($research(el).text());
            // Heuristic: Check for a year and some uppercase letters (likely a journal name)
            if (text.match(/\d{4}/) && text.match(/[A-Z]{3,}/)) {
                 synthesizedData.논문.push(text);
            }
        });

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...synthesizedData, error }));
}

main();
