
const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

// This script reads a local HTML file and parses it with Cheerio.
// It's much faster than using a full browser.

const [
  json_file_path,
  html_file_path,
  doctor_name
] = process.argv.slice(2);

let originalData = {};
try {
    originalData = JSON.parse(fs.readFileSync(json_file_path, 'utf-8'));
} catch (e) {
    console.error(`Failed to read original data file: ${e.message}`);
    process.exit(1);
}

try {
    const html = fs.readFileSync(html_file_path, 'utf-8');
    const $ = cheerio.load(html);

    let popup;
    $('.popup').each((i, elem) => {
        const h4 = $(elem).find('h4').text();
        if (h4.includes(doctor_name)) {
            popup = elem;
            return false; // break the loop
        }
    });

    if (!popup) {
        throw new Error(`Popup for doctor ${doctor_name} not found.`);
    }

    const profileUrl = $('.profile-top .img img', popup).attr('src');
    const specialty = $('.profile-top .txt p.part', popup).text().trim();

    const getDlItems = (title) => {
        let items = [];
        $('dl', popup).each((i, dl_elem) => {
            const dt = $(dl_elem).find('dt').text();
            if (dt.includes(title)) {
                $(dl_elem).find('dd').each((j, dd_elem) => {
                    items.push($(dd_elem).text().trim().replace(/·/g, '').trim());
                });
            }
        });
        return items;
    };

    const educationItems = getDlItems('학력');
    const experienceItems = getDlItems('경력');
    const paperItems = getDlItems('국제(국내)학회발표');

    const education = educationItems.map(c => ({ date: null, content: c.replace(/"/g, "") }));
    const experience = experienceItems.map(c => ({ date: null, content: c.replace(/"/g, "") }));
    const papers = paperItems.map(c => c.replace(/"/g, ""));

    const synthesizedData = {
        profileUrl: profileUrl ? new URL(profileUrl, 'http://www.pohangwoori.com/').href : null,
        specialty: specialty,
        '학력': education,
        '경력': experience,
        '논문': papers,
    };

    const isAttend = $.text().includes(doctor_name);
    const finalData = { ...originalData, ...synthesizedData, isAttend };

    const hasNewData = education.length > 0 || experience.length > 0 || papers.length > 0;

    if (hasNewData) {
        finalData.isExist = true;
        finalData.isSearchType = 'html_cheerio'; // Mark as parsed with cheerio from local file
        finalData.error = null;
    } else {
        finalData.isExist = false;
        finalData.isSearchType = 'html_cheerio_failed';
        finalData.error = 'Cheerio parser could not extract new data from local file.';
    }

    fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2));
    console.log(JSON.stringify({ success: true, message: `Successfully updated ${path.basename(json_file_path)} with local parser.` }, null, 2));

} catch (e) {
    const finalData = { ...originalData, isExist: false, isSearchType: 'html_cheerio_failed', error: e.message };
    fs.writeFileSync(json_file_path, JSON.stringify(finalData, null, 2));
    console.error(JSON.stringify({ success: false, error: e.message }, null, 2));
}
