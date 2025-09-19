const cheerio = require('cheerio');
const fs = require('fs');
const { Iconv } = require('iconv');

(async () => {
    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site } = doctorData;

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

        console.log('--- Debugging Headers ---');
        $('table').each((i, table) => {
            const $table = $(table);
            const headerCell = $table.find('td[bgcolor="#4D63A0"]');
            const headerText = headerCell.text().trim();

            if (headerText) {
                console.log(`Found header: [${headerText}]`);
            }
        });

    } catch (e) {
        console.error(`Error during debug execution: ${e.message}`);
    }
})();
