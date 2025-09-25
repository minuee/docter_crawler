
const cheerio = require('cheerio');

function parseDoctorData(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const doctorData = {};

    // Sanitize HTML: remove script and style tags
    $('script, style, nav, .both_unvisible, .floating_header, .floating_category, .post_btn2, .division-line-x, #blog-gnb, #blog-title, #blog-category, #blog-profile, #blog-rss, #blog-search, #widget-ccl, #postListBottom').remove();

    const postViewArea = $('#post-view220398002334').text();

    const sections = {
        '학력': [],
        '경력': [],
        '학술': [],
        '저서': [],
        '논문': []
    };

    let currentSection = null;

    const lines = postViewArea.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (const line of lines) {
        if (line.includes('학력')) {
            currentSection = '학력';
        } else if (line.includes('경력')) {
            currentSection = '경력';
        } else if (line.includes('학술활동')) {
            currentSection = '학술';
        } else if (line.includes('저서')) {
            currentSection = '저서';
        } else if (line.includes('연구실적:국외 학술지') || line.includes('연구실적:국내 학술지')) {
            currentSection = '논문';
        } else if (currentSection) {
            if (currentSection === '논문') {
                sections[currentSection].push(line.replace(/"/g, "'")); // Remove double quotes for JSON safety
            } else {
                sections[currentSection].push({ "content": line.replace(/"/g, "'") }); // Remove double quotes for JSON safety
            }
        }
    }

    // Clean up 학력 and 경력 to remove the section titles themselves if they were captured
    sections['학력'] = sections['학력'].filter(item => item.content !== '학력');
    sections['경력'] = sections['경력'].filter(item => item.content !== '경력');
    sections['학술'] = sections['학술'].filter(item => item.content !== '학술활동');
    sections['저서'] = sections['저서'].filter(item => item.content !== '저서');


    // Add extracted data to doctorData
    if (sections['학력'].length > 0) doctorData['학력'] = sections['학력'];
    if (sections['경력'].length > 0) doctorData['경력'] = sections['경력'];
    if (sections['학술'].length > 0) doctorData['학술'] = sections['학술'];
    if (sections['저서'].length > 0) doctorData['저서'] = sections['저서'];
    if (sections['논문'].length > 0) doctorData['논문'] = sections['논문'];

    return doctorData;
}

// This part will be executed when the script is run directly
if (require.main === module) {
    const fs = require('fs');
    const path = require('path');

    const htmlFilePath = process.argv[2]; // Expect HTML file path as argument
    if (!htmlFilePath) {
        console.error('Usage: node parser.js <path_to_html_file>');
        process.exit(1);
    }

    try {
        const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
        const parsedData = parseDoctorData(htmlContent);
        console.log(JSON.stringify(parsedData, null, 2));
    } catch (error) {
        console.error('Error parsing HTML:', error);
        process.exit(1);
    }
}

module.exports = parseDoctorData;
