const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument.');
        process.exit(1);
    }

    // This will be written to by the script
    const outputFilePath = 'parser_output.json';

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Changed from 'networkidle' to 'domcontentloaded' to comply with guidelines
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        // Added a timeout to allow for dynamic content loading, as a fallback.
        await page.waitForTimeout(5000);
        const html = await page.content();
        const $ = cheerio.load(html);

        const synthesizedData = { 학력: [], 경력: [], 학술: [], 수상: [], 논문: [], 언론: [], 저서: [] };

        let profileImgSrc = $('.doctorInfo_dis_sticky.mo_none img').attr('src');
        if (profileImgSrc) {
            profileImgSrc = profileImgSrc.replace(/&amp;&amp;/g, '&');
            synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
        }

        synthesizedData.specialty = $('.doctorInfo_part_dis').text().trim().replace(/\s+/g, ' ').replace(/"/g, '');

        const processBrText = (selector) => {
            const lines = [];
            const rawHtml = $(selector).html();
            if (rawHtml) {
                rawHtml.split('<br>').forEach(line => {
                    const cleanLine = $('<div>' + line + '</div>').text().trim();
                    if (cleanLine) {
                        lines.push(cleanLine.replace(/^- /, '').trim());
                    }
                });
            }
            return lines;
        };

        const tab0Lines = processBrText('.doctorInfo_dis02_tab00');
        tab0Lines.forEach(line => {
            if (line.includes('졸업') || line.includes('박사')) {
                synthesizedData.학력.push({ date: null, content: line });
            } else if (line.includes('EBS 명의')) {
                 synthesizedData.언론.push({ targetDate: null, type: '방송', text: line, url: null, issuer: 'EBS' });
            } else {
                synthesizedData.경력.push({ date: null, content: line });
            }
        });

        const tab1Lines = processBrText('.doctorInfo_dis02_tab01');
        tab1Lines.forEach(line => {
            if (line.includes('연수') || line.includes('방문교수')) {
                synthesizedData.경력.push({ date: null, content: line });
            } else {
                synthesizedData.학술.push({ date: null, content: line });
            }
        });
        
        const tab2Lines = processBrText('.doctorInfo_dis02_tab02');
        synthesizedData.논문 = tab2Lines.slice(1);

        const tab3Lines = processBrText('.doctorInfo_dis02_tab03');
        tab3Lines.forEach(line => {
            synthesizedData.수상.push({ date: null, content: line });
        });

        // Write to file instead of stdout
        fs.writeFileSync(outputFilePath, JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        fs.writeFileSync(outputFilePath, JSON.stringify({ error: e.message }));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();