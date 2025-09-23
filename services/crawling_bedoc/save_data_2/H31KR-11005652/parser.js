const axios = require('axios');
const cheerio = require('cheerio');

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').replace(/^-/, '').trim() : '';
};

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const synthesizedData = {
        isAttend: false,
        profileUrl: null,
        '학력': [],
        '경력': [],
    };
    let error = null;

    try {
        const response = await axios.get(hospital_site, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);

        let doctorDiv = null;
        $('.doctor').each((i, el) => {
            const nameText = $(el).find('p.name_fontload').text();
            if (nameText.includes(bedoc_doctorname)) {
                doctorDiv = $(el);
                return false; // break loop
            }
        });

        if (!doctorDiv) {
            throw new Error(`Could not find doctor div for ${bedoc_doctorname}`);
        }

        synthesizedData.isAttend = true;
        synthesizedData.profileUrl = doctorDiv.find('dt.fl img').attr('src') || null;

        doctorDiv.find('dd.fl p').each((i, p_el) => {
            const htmlContent = $(p_el).html();
            const lines = htmlContent.split(/<br\s*\/?>/i).map(line => cleanText($('<div>').html(line).text()));
            
            lines.forEach(line => {
                if (!line || line.startsWith('※')) return;

                if (line.includes('졸업') || line.includes('수료')) {
                    synthesizedData['학력'].push({ content: line });
                } else {
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