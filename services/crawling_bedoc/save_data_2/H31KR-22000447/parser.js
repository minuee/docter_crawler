const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

(async () => {
    const jsonPath = process.argv[2];
    if (!jsonPath) {
        console.error('Please provide a path to the JSON file as an argument.');
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
        console.error('Failed to read or parse the JSON file.');
        process.exit(1);
    }

    const { bedoc_doctorname, hospital_site } = doctorData;

    if (!hospital_site) {
        console.error('hospital_site not found in the JSON file.');
        process.exit(1);
    }

    console.log(`Navigating to ${hospital_site} for doctor ${bedoc_doctorname}...`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let synthesizedData = {
        '학력': [],
        '경력': [],
        '학술': [],
        '저서': [],
        '논문': [],
        '수상': []
    };
    let success = false;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        let doctorSection;
        $('section.elementor-section').each((i, el) => {
            const h2 = $(el).find('h2.elementor-heading-title');
            if (h2.text().includes(bedoc_doctorname)) {
                doctorSection = $(el);
                return false; // break the loop
            }
        });

        if (!doctorSection) {
            throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
        }

        const profileImgSrc = doctorSection.find('.elementor-widget-image img').attr('src');
        synthesizedData.profileUrl = profileImgSrc ? new URL(profileImgSrc, hospital_site).href : null;
        
        const specialtyText = doctorSection.find('h2.elementor-heading-title:contains("베스트")').text();
        synthesizedData.specialty = specialtyText ? specialtyText.trim().replace(/"/g, '') : null;

        let detailsEditor;
        doctorSection.find('.elementor-widget-text-editor .elementor-widget-container').each((i, el) => {
            if ($(el).find('p').length > 0) {
                detailsEditor = $(el);
                return false;
            }
        });
        
        if (detailsEditor) {
            const detailsHtml = detailsEditor.html();
            const lines = detailsHtml.split('<br>').map(line => $('<div>').html(line).text().trim()).filter(line => line);

            let isBookSection = false;
            lines.forEach(line => {
                const cleanLine = line.replace(/"/g, '').trim();
                if (!cleanLine) return;

                if (cleanLine.startsWith('저서')) {
                    isBookSection = true;
                    return; 
                }

                if (isBookSection) {
                    synthesizedData.저서.push({ date: null, content: cleanLine });
                } else if (cleanLine.includes('학회') || cleanLine.includes('의사회')) {
                    synthesizedData.학술.push({ date: null, content: cleanLine });
                } else if (cleanLine.includes('졸업') || cleanLine.includes('박사') || cleanLine.includes('수료')) {
                    synthesizedData.학력.push({ date: null, content: cleanLine });
                } else {
                    synthesizedData.경력.push({ date: null, content: cleanLine });
                }
            });
        }


        success = true;
        console.log('--- PARSED DATA ---');
        console.log(JSON.stringify(synthesizedData, null, 2));

    } catch (e) {
        console.error('Error during parsing:', e.stack);
        synthesizedData.error = e.message;
    } finally {
        await browser.close();

        const finalData = { ...doctorData, ...synthesizedData };
        if (success && (finalData.학력.length > 0 || finalData.경력.length > 0)) {
            finalData.isExist = true;
            finalData.isSearchType = 'html_playwright';
        } else {
            finalData.isExist = false;
            finalData.isSearchType = 'html_playwright_failed';
        }
        
        fs.writeFileSync(jsonPath, JSON.stringify(finalData, null, 2));
        console.log(`File updated: ${jsonPath}`);
    }
})();
