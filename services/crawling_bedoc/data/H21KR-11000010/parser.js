const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;
    const baseUrl = new URL(hospital_site);
    const baseParams = baseUrl.searchParams;
    const dept = baseParams.get('dept');
    const doct = baseParams.get('doct');

    let browser;
    let error = null;
    let finalData = {
        profileUrl: null,
        specialty: '',
        학력: [],
        경력: [],
        학술: [],
        논문: [],
        언론: [],
        isAttend: false
    };

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
        const page = await context.newPage();

        // 1. Main Page
        await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 60000 });
        let $ = cheerio.load(await page.content());

        if ($('body').text().includes(bedoc_doctorname)) {
            finalData.isAttend = true;
        }

        const imgSrc = $('#doctor img').attr('src');
        if (imgSrc) {
            finalData.profileUrl = new URL(imgSrc, baseUrl).href;
        }
        
        let specialty = [];
        specialty.push($('dt:contains("[진료분야]")').next('dd').text().trim());
        specialty.push($('dt:contains("[전문진료]")').next('dd').text().trim());
        finalData.specialty = specialty.filter(s => s).join(', ');

        // 2. "약력" (History) Page
        const historyUrl = `${baseUrl.origin}/clinic/clinic_doc_view01_02.jsp?dept=${dept}&doct=${doct}`;
        await page.goto(historyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        $ = cheerio.load(await page.content());
        
        $('h4.subtit_h4:contains("학력")').next('ul').find('li').each((i, el) => {
            const text = $(el).text().trim();
            if (text) finalData.학력.push({ date: null, content: text.replace(/"/g, '') });
        });

        $('h4.subtit_h4:contains("경력")').next('ul').find('li').each((i, el) => {
            const text = $(el).html().split('<br>').map(t => cheerio.load(t).text().trim()).filter(t => t);
            text.forEach(t => finalData.경력.push({ date: null, content: t.replace(/"/g, '') }));
        });

        $('h4.subtit_h4:contains("학회")').next('ul').find('li').each((i, el) => {
            const text = $(el).html().split('<br>').map(t => cheerio.load(t).text().trim()).filter(t => t);
            text.forEach(t => finalData.학술.push({ date: null, content: t.replace(/"/g, '') }));
        });

        // 3. "연구" (Research/Papers) Page
        const researchUrl = `${baseUrl.origin}/clinic/clinic_doc_view01_05.jsp?dept=${dept}&doct=${doct}`;
        await page.goto(researchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        $ = cheerio.load(await page.content());

        const papersHtml = $('ul.desc1 li.text_en').html();
        if (papersHtml) {
            finalData.논문 = papersHtml.split('<br>').map(p => cheerio.load(p).text().trim()).filter(p => p);
        }

        // 4. "언론보도" (Media) Page
        const mediaUrl = `${baseUrl.origin}/clinic/clinic_doc_view01_04.jsp?dept=${dept}&doct=${doct}`;
        await page.goto(mediaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        $ = cheerio.load(await page.content());

        $('div.medi_list03 ul li').each((i, el) => {
            const text = $(el).find('a').text().trim();
            const date = $(el).find('span.float_right').text().trim();
            const urlAttr = $(el).find('a').attr('href');
            const urlMatch = urlAttr ? urlAttr.match(/goUrl\('([^']+)'\)/) : null;
            const url = urlMatch ? urlMatch[1] : null;
            
            if (text) {
                finalData.언론.push({
                    targetDate: date || null,
                    type: '기사',
                    text: text.replace(/"/g, ''),
                    url: url,
                    issuer: null // Issuer not available
                });
            }
        });

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    console.log(JSON.stringify({
        error: error,
        ...finalData
    }));
})();
