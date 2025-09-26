const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function main() {
    const doctorName = process.argv[2];
    const deptName = process.argv[3];
    const jsonDataPath = process.argv[4];

    if (!doctorName || !deptName || !jsonDataPath) {
        console.error('Usage: node parser.js <doctorName> <deptName> <jsonDataPath>');
        process.exit(1);
    }

    try {
        const originalData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf-8'));
        const listUrl = originalData.hospital_site; // Use the specific URL from the JSON file

        if (!listUrl) {
            throw new Error('hospital_site URL not found in the JSON data.');
        }

        // Step 1: Find the doctor's sequence number from the correct page
        const listResponse = await axios.get(listUrl);
        const $list = cheerio.load(listResponse.data);

        let seq = null;
        $list('.drbox').each((i, elem) => {
            const name = $list(elem).find('.drname .t2').text().trim();
            if (name === doctorName) {
                const href = $list(elem).find('.drbt a').attr('href');
                const match = href.match(/indoc_all\((\d+)\)/);
                if (match) {
                    seq = match[1];
                    return false; // break loop
                }
            }
        });

        if (!seq) {
            throw new Error(`Could not find doctor seq for ${doctorName} on page ${listUrl}`);
        }

        // Step 2: Fetch and parse the detailed profile
        const detailUrl = `https://www.myongji-sm.co.kr/xmldata/doctor.php?md_seq=${seq}`;
        const detailResponse = await axios.get(detailUrl);
        const $ = cheerio.load(detailResponse.data, { decodeEntities: false });

        const specialty = $('.drview_visual .txt4 span:last-child').text().trim();

        const education = [];
        const experience = [];
        
        $('.drstory1 .t2').html().split('<br>').forEach(line => {
            const text = $('<div>').html(line).text().trim().replace('·', '').trim();
            if (text) {
                if (text.includes('졸업') || text.includes('학사') || text.includes('석사') || text.includes('박사')) {
                    education.push({ content: text });
                } else {
                    experience.push({ content: text });
                }
            }
        });

        const books = [];
        $('.drstory2 .t2').html().split('<br>').forEach(line => {
            const text = $('<div>').html(line).text().trim().replace('·', '').trim();
            if (text) {
                books.push({ content: text });
            }
        });
        
        let profileUrl = null;
        const bgStyle = $('.drview_visual').attr('style');
        if (bgStyle) {
            const urlMatch = bgStyle.match(/url\('?([^']+)'?\)/);
            if (urlMatch && urlMatch[1]) {
                profileUrl = new URL(urlMatch[1], 'https://www.myongji-sm.co.kr/').href;
            }
        }

        const parsedData = {
            profileUrl,
            specialty,
            "학력": education,
            "경력": experience,
            "저서": books,
        };

        const mergedData = { ...originalData, ...parsedData, isSearchType: 'html_playwright', isExist: true, error: null };
        fs.writeFileSync(jsonDataPath, JSON.stringify(mergedData, null, 2), 'utf-8');

        console.log(JSON.stringify(mergedData, null, 2));

    } catch (e) {
        const errorData = { isSearchType: 'html_playwright_failed', error: e.message };
        try {
            const originalData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf-8'));
            const mergedData = { ...originalData, ...errorData };
            fs.writeFileSync(jsonDataPath, JSON.stringify(mergedData, null, 2), 'utf-8');
        } catch (readError) {
            // ignore if can't read original file
        }
        console.error(e.message);
        process.exit(1);
    }
}

main();
