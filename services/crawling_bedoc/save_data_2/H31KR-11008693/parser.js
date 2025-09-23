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
        await page.goto(url, { waitUntil: 'networkidle' });
        const html = await page.content();
        const $ = cheerio.load(html);

        const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], 논문: [], 언론: [], 저서: [] };

        const doctorSection = $("h4:contains('대표원장')").next('.s_con02');

        if (doctorSection.length > 0) {
            doctorSection.find('.s_con02_4').each((i, el) => {
                const text = $(el).text();
                if (text.includes('집단요검사를 하도록 국회에 청원하여 입법화')) {
                    synthesizedData.경력.push({ date: '1998', content: '초중고생 대상 집단요검사 입법화 청원 및 시행' });
                }
                if (text.includes('카자흐스탄에서 의료봉사')) {
                    synthesizedData.경력.push({ date: '1995년부터', content: '카자흐스탄 의료봉사' });
                }
                if (text.includes('소아과학교과서에 논문 게재')) {
                    synthesizedData.논문.push('국제 소아과학교과서에 논문 게재');
                }
                if (text.includes("'Practical Paediatric Nephrology'의 저자로 참여")) {
                    synthesizedData.저서.push({ date: null, content: "'Practical Paediatric Nephrology' 저자 참여", issuer: null });
                }
                 if (text.includes('경희대 명예교수')) {
                    synthesizedData.경력.push({ date: '현재', content: '경희대학교 명예교수' });
                }
            });

            const academicSocietiesSection = doctorSection.next('.s_con02_5').find("h5:contains('소속학회 및 현재직위')").parent();
            academicSocietiesSection.find('li').each((i, el) => {
                const text = $(el).text().trim();
                if(text) synthesizedData.학술.push({ date: null, content: text });
            });

            const qualificationsSection = doctorSection.next('.s_con02_5').find("h5:contains('자격 및 면허')").parent();
            qualificationsSection.find('li').each((i, el) => {
                const text = $(el).text().trim();
                 if(text) {
                    const match = text.match(/(\d{4}\.\d{2})\s*(.*)/);
                    if (match) {
                        synthesizedData.경력.push({ date: match[1].replace('.','-'), content: match[2].trim() });
                    } else {
                        synthesizedData.경력.push({ date: null, content: text });
                    }
                 }
            });
        }
        
        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
