const axios = require('axios');
const cheerio = require('cheerio');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser2.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const synthesizedData = {
        isAttend: false,
        profileUrl: null,
        specialty: null,
        '학력': [],
        '경력': [],
    };
    let error = null;

    try {
        const response = await axios.get(hospital_site);
        const $ = cheerio.load(response.data);

        if ($('body').text().includes(bedoc_doctorname)) {
            synthesizedData.isAttend = true;
        }

        synthesizedData.profileUrl = $('.step2_img img').attr('src') || null;
        synthesizedData.specialty = cleanText($('.step2_txt .part:contains("진료분야") .part_txt').text());

        $('ul.academic li').each((i, el) => {
            const text = cleanText($(el).text());
            if (text) {
                synthesizedData['학력'].push({ content: text });
            }
        });

        $('ul.career li').each((i, el) => {
            const htmlContent = $(el).html();
            const lines = htmlContent.split('<br>').map(line => cleanText($('<div>').html(line).text()));
            lines.forEach(line => {
                if (line) {
                    synthesizedData['경력'].push({ content: line });
                }
            });
        });

    } catch (e) {
        error = `Error during parsing: ${e.message}`;
    }

    console.log(JSON.stringify({ ...synthesizedData, error }));
}

main();
