const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseProfile(page) {
    const synthesizedData = {
        profileUrl: null,
        specialty: null,
        학력: [],
        경력: [],
        언론: [],
        논문: [],
        수상: [],
        학술: [],
        저서: [],
    };

    try {
        // Helper function for navigation
        const navigateToTab = async (tabHref) => {
            const linkHandle = await page.$(`a[href*="${tabHref}"]`);
            if (linkHandle) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
                    linkHandle.click(),
                ]);
                return true;
            }
            const baseUrl = page.url().split('?')[0].replace(/clinic_doc_view01_\d{2}\.jsp/, tabHref);
            if(page.url() !== baseUrl) {
                await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
                return true;
            }
            console.error(`Could not find or navigate to tab for: ${tabHref}`);
            return false;
        };

        // 1. Extract from initial page (소개)
        synthesizedData.profileUrl = await page.evaluate(() => {
            const img = document.querySelector('#doctor .slidesjs-slide');
            if (!img) return null;
            const baseUrl = 'https://www.uemc.ac.kr';
            const src = img.getAttribute('src');
            return src.startsWith('http') ? src : baseUrl + src;
        });

        synthesizedData.specialty = await page.evaluate(() => {
            const specialties = [];
            const dls = document.querySelectorAll('div.info dl');
            dls.forEach(dl => {
                const dt = dl.querySelector('dt');
                const dd = dl.querySelector('dd');
                if (dt && dd && (dt.textContent && (dt.textContent.includes('[전문분야]') || dt.textContent.includes('[전문진료]')))) {
                    specialties.push(dd.textContent.trim());
                }
            });
            return specialties.join(', ');
        });

        // 2. Navigate and parse "약력" (History)
        if (await navigateToTab('clinic_doc_view01_02.jsp')) {
            const historySections = await page.evaluate(() => {
                const sections = { 학력: [], 경력: [] };
                const headers = document.querySelectorAll('.contents h4, .contents .subtit_h4');
                headers.forEach(header => {
                    const title = header.textContent.trim();
                    let key = null;
                    if (title.includes('학력')) key = '학력';
                    else if (title.includes('경력')) key = '경력';

                    if (key) {
                        let list = header.nextElementSibling;
                        if (list && list.tagName === 'UL') {
                            list.querySelectorAll('li').forEach(li => {
                                const text = li.textContent.trim();
                                const dateMatch = text.match(/(\d{4}(\.\d{2})?(\s*~\s*\d{4}(\.\d{2})?)?)/);
                                const date = dateMatch ? dateMatch[0].trim() : null;
                                const content = text.replace(date, '').trim().replace(/^-/, '').trim();
                                if (content) sections[key].push({ date, content });
                            });
                        }
                    }
                });
                return sections;
            });
            synthesizedData.학력 = historySections.학력;
            synthesizedData.경력 = historySections.경력;
        }

        // 3. Navigate and parse "언론보도" (Media)
        if (await navigateToTab('clinic_doc_view01_04.jsp')) {
            synthesizedData.언론 = await page.evaluate(() => {
                const mediaItems = [];
                document.querySelectorAll('.medi_list03 ul li').forEach(li => {
                    const typeMatch = li.innerText.match(/\s*\[(.*?)\]/);
                    const type = typeMatch ? typeMatch[1].trim() : '기사';
                    const text = li.querySelector('a') ? li.querySelector('a').textContent.trim() : '';
                    const url = li.querySelector('a') ? li.querySelector('a').href : null;
                    const issuer = li.querySelector('.float_right') ? li.querySelector('.float_right').textContent.trim() : null;
                    if (text) {
                        mediaItems.push({ targetDate: null, type, text, url, issuer });
                    }
                });
                return mediaItems;
            });
        }

        // 4. Navigate and parse "연구" (Research/Papers) - Cheerio로 직접 파싱하도록 수정
        if (await navigateToTab('clinic_doc_view01_05.jsp')) {
            const researchPageContent = await page.content();
            const $research = cheerio.load(researchPageContent);

            const container = $research('ul.desc1');
            if (container.length === 0) return synthesizedData; // 컨테이너 없으면 반환

            // 수상 (Awards)
            const awardsSection = container.find('li:has(strong:contains("최근 10년간 수상경력"))');
            if (awardsSection.length > 0) {
                awardsSection.find('p').each((i, el) => {
                    const line = cleanText($(el).text());
                    const dateMatch = line.match(/^\d{4}/);
                    const date = dateMatch ? dateMatch[0] : null;
                    const content = line.replace(/^\d{4}\s*/, '');
                    synthesizedData.수상.push({ date, content });
                });
            }

            // 저서 (Books)
            const booksSection = container.find('li:has(strong:contains("최근 10년간 영문 단독 저서"))');
            if (booksSection.length > 0) {
                booksSection.find('p').each((i, el) => {
                    const line = cleanText($(el).text());
                    const titleMatch = line.match(/\u300a(.*?)\u300b/);
                    const content = titleMatch ? `\u300a${titleMatch[1]}\u300b` : line;
                    const parenthesisMatch = line.match(/\((.*?)\)/);
                    let issuer = null;
                    let date = null;
                    if (parenthesisMatch) {
                        const parts = parenthesisMatch[1].split(',');
                        issuer = parts[0] ? parts[0].trim() : null;
                        if (parts[1]) {
                            const yearMatch = parts[1].match(/\d{4}/);
                            date = yearMatch ? yearMatch[0] : null;
                        }
                    }
                    synthesizedData.저서.push({ date, content, issuer });
                });
            }

            // 논문 (Papers)
            const papersSection = container.find('li:has(strong:contains("국외 전문 학술지"))');
            if (papersSection.length > 0) {
                papersSection.find('p').each((i, el) => {
                    const line = cleanText($(el).text());
                    synthesizedData.논문.push(line);
                });
            }

            // 학술 (Academic Activities)
            const academicSection = container.find('li:has(strong:contains("학술대회 논문 발표 및 강의"))');
            if (academicSection.length > 0) {
                academicSection.find('p').each((i, el) => {
                    const line = cleanText($(el).text());
                    const dateMatch = line.match(/\d{4}\.\d{1,2}\.\d{1,2}\.?$/);
                    const date = dateMatch ? dateMatch[0].replace(/\.$/, '') : null;
                    let content = line.replace(/\s*\d{4}\.\d{1,2}\.\d{1,2}\.?$/, '');
                    const societyMatch = content.match(/[가-힣\s]+학회|[A-Z\s]+Congress|[A-Z\s]+symposium|[A-Z\s]+Conference/i);
                    const society = societyMatch ? societyMatch[0].trim() : content;
                    synthesizedData.학술.push({ date, content: society });
                });
            }
        }

    } catch (error) {
        console.error(`An error occurred during parsing: ${error.message}`);
    }

    return synthesizedData;
}



/**
 * Main function to orchestrate the parsing process.
 * @param {string} url - The URL of the doctor's page.
 * @param {string} siteType - The type of site ('single', 'list', 'popup').
 * @param {string} doctorName - The name of the doctor.
 * @param {string} deptName - The department name.
 * @param {string} doctorFilePath - The path to the doctor's JSON file.
 */
async function main(url, siteType, doctorName, deptName, doctorFilePath) {
    let browser;
    const timeout = 120000; // 2-minute timeout for the entire process

    const timer = setTimeout(() => {
        console.error('Script timed out after 2 minutes.');
        if (browser) {
            browser.close();
        }
        process.exit(1);
    }, timeout);

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        let synthesizedData = {};

        if (siteType === 'single') {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
            synthesizedData = await parseProfile(page);
        } else if (siteType === 'list') {
            // TODO: Implement logic for 'list' site type
            // 1. Navigate to the list page
            // 2. Find the doctor by name/dept
            // 3. Click the link to the detail page
            // 4. Wait for navigation and then parse
            console.error("'list' site type is not yet implemented.");
        } else if (siteType === 'popup') {
            // TODO: Implement logic for 'popup' site type
            // 1. Navigate to the page
            // 2. Find the doctor and click the popup button
            // 3. Handle the new popup window or modal
            // 4. Parse the content from the popup
            console.error("'popup' site type is not yet implemented.");
        }

        // Merge with original doctorData and write to file
        const originalDoctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
        const updatedDoctorData = { ...originalDoctorData, ...synthesizedData };

        // Update isSearchType and isExist based on whether data was extracted
        if (Object.keys(synthesizedData).length > 0 && !synthesizedData.error) {
            updatedDoctorData.isSearchType = 'html_playwright';
            updatedDoctorData.isExist = true;
        } else {
            updatedDoctorData.isSearchType = 'html_playwright_failed';
            updatedDoctorData.isExist = false;
        }

        // Ensure isAttend is set correctly, especially if it was null before
        if (synthesizedData.isAttend !== undefined) {
            updatedDoctorData.isAttend = synthesizedData.isAttend;
        } else if (updatedDoctorData.isAttend === null) {
            updatedDoctorData.isAttend = false; // Default to false if not explicitly set
        }

        fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
        console.log(`Updated ${doctorFilePath} with Playwright parsing results.`);

    } catch (error) {
        console.error(`An error occurred in the main process: ${error.message}`);
        // In case of a critical error, update the file to reflect failure
        const originalDoctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
        const updatedDoctorData = { ...originalDoctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
        fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
    } finally {
        if (browser) {
            await browser.close();
        }
        clearTimeout(timer);
    }
}

// --- Script Execution ---
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 5) { // Updated to expect 5 arguments
        console.error('Usage: node parser.js <url> <siteType> <doctorName> <deptName> <doctorFilePath>');
        process.exit(1);
    }
    const [url, siteType, doctorName, deptName, doctorFilePath] = args;
    main(url, siteType, doctorName, deptName, doctorFilePath);
}