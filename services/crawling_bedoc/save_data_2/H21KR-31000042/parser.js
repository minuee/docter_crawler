const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
    const doctorName = process.argv[2];
    const url = process.argv[3];

    if (!doctorName || !url) {
        console.error('Please provide a doctor name and URL as arguments.');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const html = await page.content();
        const $ = cheerio.load(html);

        let doctorDataVar = null;
        $('script').each((i, el) => {
            const scriptContent = $(el).html();
            if (scriptContent && scriptContent.includes('var dataDoctor =')) {
                const startIndex = scriptContent.indexOf('var dataDoctor =') + 'var dataDoctor ='.length;
                const endIndex = scriptContent.indexOf(';', startIndex);
                let dataString = scriptContent.substring(startIndex, endIndex).trim();
                
                if (dataString.endsWith('.itm')) {
                    dataString = dataString.slice(0, -4);
                }
                
                doctorDataVar = JSON.parse(dataString);
            }
        });

        if (!doctorDataVar || !doctorDataVar.itm) {
            throw new Error('Could not find or parse the dataDoctor variable.');
        }

        const doctorInfo = doctorDataVar.itm.find(doc => doc.name === doctorName);

        if (!doctorInfo) {
            throw new Error(`Doctor '${doctorName}' not found in dataDoctor variable.`);
        }

        const synthesizedData = {};

        synthesizedData.profileUrl = doctorInfo.image2 ? new URL(doctorInfo.image2, url).href : null;
        synthesizedData.specialty = doctorInfo.special ? doctorInfo.special.replace(/\r\n/g, ', ').replace(/"/g, '') : null;

        synthesizedData.경력 = [];
        synthesizedData.학술 = [];
        if (doctorInfo.profile) {
            const profileLines = doctorInfo.profile.split(/\r\n|<br\/>/);
            profileLines.forEach(line => {
                const cleanLine = line.replace(/·|\u00b7/g, '').trim();
                if (cleanLine) {
                    if (cleanLine.includes('학회')) {
                        synthesizedData.학술.push({ date: null, content: cleanLine.replace(/"/g, '') });
                    } else {
                        synthesizedData.경력.push({ date: null, content: cleanLine.replace(/"/g, '') });
                    }
                }
            });
        }
        
        synthesizedData.학력 = [];
        synthesizedData.수상 = [];
        synthesizedData.논문 = [];
        synthesizedData.저서 = [];
        synthesizedData.언론 = [];

        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
