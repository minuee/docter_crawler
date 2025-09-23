const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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
    let synthesizedData = {};
    let success = false;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        synthesizedData = await page.evaluate((name) => {
            const data = {};
            const baseUrl = document.location.origin;

            const docListItems = Array.from(document.querySelectorAll('ul.doc_list li'));
            const doctorIndex = docListItems.findIndex(li => li.innerText.includes(name));

            if (doctorIndex === -1) {
                // Can't throw an error here that will be caught outside, so return an error object
                return { error: `Doctor ${name} not found in the list.` };
            }

            const popupId = `#element_to_pop_up_${String(doctorIndex + 1).padStart(2, '0')}`;
            const popupNode = document.querySelector(popupId);

            if (!popupNode) {
                return { error: `Popup div with ID ${popupId} not found.` };
            }

            const profileImg = popupNode.querySelector('.top img');
            if (profileImg && profileImg.src) {
                data.profileUrl = new URL(profileImg.src, baseUrl).href;
            }

            data.specialty = popupNode.querySelector('.top .sp_t')?.innerText.trim().replace(/"/g, '') || null;

            const sections = {
                '학력': [],
                '경력': [],
                '학회': [], // This will be mapped to '학술'
            };

            popupNode.querySelectorAll('.title_bar').forEach(titleBar => {
                const title = titleBar.querySelector('span').innerText.trim();
                const contentList = titleBar.nextElementSibling;
                if (contentList && contentList.classList.contains('doc_profile')) {
                    const items = contentList.innerHTML.split(/<br\s*\/?>/i)
                                                 .map(item => item.replace(/<[^>]*>/g, '').trim().replace(/"/g, ''))
                                                 .filter(Boolean);
                    if (sections.hasOwnProperty(title)) {
                        sections[title] = items.map(item => ({ date: null, content: item }));
                    }
                }
            });

            data.학력 = sections['학력'];
            data.경력 = sections['경력'];
            data.학술 = sections['학회'];
            data.수상 = [];
            data.논문 = [];

            return data;
        }, bedoc_doctorname);

        if (synthesizedData.error) {
            throw new Error(synthesizedData.error);
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