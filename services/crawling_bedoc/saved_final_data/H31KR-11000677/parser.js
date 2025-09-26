const cheerio = require('cheerio');
const fs = require('fs');
const { Iconv } = require('iconv');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    let error = null;
    let parsedDetails = {
        profileUrl: null,
        specialty: null,
        학력: [],
        경력: [],
        학술: [],
        수상: [],
        논문: [],
        저서: [],
        isAttend: false
    };

    try {
        const response = await new Promise((resolve, reject) => {
            require('http').get(hospital_site, (res) => {
                const data = [];
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => resolve(Buffer.concat(data)));
            }).on('error', err => reject(err));
        });
        
        const iconv = new Iconv('euc-kr', 'utf-8');
        const utf8Html = iconv.convert(response).toString('utf-8');
        const $ = cheerio.load(utf8Html);

        if ($('body').text().includes(bedoc_doctorname)) {
            parsedDetails.isAttend = true;
        }

        const profileImgSrc = $('img[src="../images/sub_img_45.gif"]').attr('src');
        if (profileImgSrc) {
            parsedDetails.profileUrl = new URL(profileImgSrc, hospital_site).href;
        }

        const sections = {
            '주요경력': [],
            '학회활동': [],
            '수상경력': [],
            '연구업적 및 저서': []
        };

        $('td[bgcolor="#4D63A0"]').each((i, headerCell) => {
            const $headerCell = $(headerCell);
            const headerText = $headerCell.text().trim();
            const $table = $headerCell.closest('table');

            if (sections.hasOwnProperty(headerText)) {
                const contentCell = $table.find('td[colspan="2"]');
                const htmlContent = contentCell.html();
                if (htmlContent) {
                    htmlContent.split('<br>').forEach(line => {
                        const cleanedLine = cheerio.load(line).text().replace(/·/g, '').trim();
                        if (cleanedLine) {
                            sections[headerText].push(cleanedLine);
                        }
                    });
                }
            }
        });

        (sections['주요경력'] || []).forEach(item => {
            if (item.includes('졸업') || item.includes('박사') || item.includes('수료')) {
                parsedDetails.학력.push({ date: null, content: item });
            } else {
                parsedDetails.경력.push({ date: null, content: item });
            }
        });

        parsedDetails.학술 = (sections['학회활동'] || []).map(item => ({ date: null, content: item }));
        parsedDetails.수상 = (sections['수상경력'] || []).map(item => ({ date: null, content: item }));

        (sections['연구업적 및 저서'] || []).forEach(item => {
            if (item.startsWith('논문')) {
                 parsedDetails.논문.push(item);
            } else if (item.includes('(') && item.includes(')')) {
                parsedDetails.저서.push({ date: null, content: item });
            } else {
                if (item.length < 100 && !item.match(/\d{4}/)) {
                    parsedDetails.저서.push({ date: null, content: item });
                } else {
                    parsedDetails.논문.push(item);
                }
            }
        });

    } catch (e) {
        error = `Error during parsing: ${e.message}`;
    }

    console.log(JSON.stringify({
        error: error,
        ...parsedDetails
    }, null, 2));
})();