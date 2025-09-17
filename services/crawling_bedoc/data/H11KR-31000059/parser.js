
const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

// 텍스트 정제 함수
const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';
};

async function parseDoctorProfile(doctorData) {
    if (!doctorData || !doctorData.hospital_site) {
        throw new Error("Invalid doctor data or missing hospital site URL.");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const synthesizedData = { 학력: [], 경력: [], 논문: [], 저서: [], 언론: [], 수상: [], 학술: [] };
    let error = null;
    let isAttend = false;

    try {
        await page.goto(doctorData.hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        if ((await page.content()).includes(doctorData.bedoc_doctorname)) {
            isAttend = true;
        }

        const profileImgSrc = await page.$eval('.profile_topImg img', img => img.src).catch(() => null);
        if (profileImgSrc) {
            synthesizedData.profileUrl = new URL(profileImgSrc, doctorData.hospital_site).href;
        }
        
        synthesizedData.specialty = cleanText(await page.$eval('dl.special dd', dd => dd.textContent).catch(() => ''));

        const careerContent = await page.evaluate(() => {
            const data = { '교수 경력': [], '진료 경력': [] };
            document.querySelectorAll('.curri_area .list').forEach(list => {
                const title = list.querySelector('.curri_title')?.textContent.trim();
                if (title === '교수 경력' || title === '진료 경력') {
                    const items = [];
                    list.querySelectorAll('.dot_list li').forEach(li => items.push(li.textContent.trim()));
                    data[title] = items;
                }
            });
            return data;
        });

        if (careerContent['교수 경력']) {
            careerContent['교수 경력'].forEach(item => synthesizedData.경력.push({ date: null, content: cleanText(item) }));
        }
        if (careerContent['진료 경력']) {
            careerContent['진료 경력'].forEach(item => synthesizedData.경력.push({ date: null, content: cleanText(item) }));
        }

        const mixedSectionItems = await page.$$eval('div#ctl00_ContentPlaceHolder1_p2 ul.dot_list li', elements => {
            return elements.map(el => ({ text: el.textContent.trim(), isPart: el.classList.contains('part') }));
        });

        let currentCategory = null;
        mixedSectionItems.forEach(item => {
            if (item.isPart) {
                currentCategory = item.text;
            } else if (item.text) {
                if (currentCategory === '학회') {
                    synthesizedData.학술.push({ date: null, content: cleanText(item.text) });
                } else if (currentCategory === '수상경력') {
                    synthesizedData.수상.push({ date: null, content: cleanText(item.text) });
                } else if (currentCategory === '보직경력') {
                    synthesizedData.경력.push({ date: null, content: cleanText(item.text) });
                }
            }
        });

        await page.click('ul.news_tab li[rel="paper"]');
        await page.waitForTimeout(500);

        let thesisMoreButtonVisible = true;
        while (thesisMoreButtonVisible) {
            const button = await page.$('.thesisBtn');
            if (button && await button.isVisible()) {
                await button.click();
                await page.waitForTimeout(500);
            } else {
                break;
            }
        }

        const paperContent = await page.content();
        const $paper = cheerio.load(paperContent);
        $paper('ol.thesisList li').each((i, el) => {
            const paperText = cleanText($paper(el).text().replace(/^\d+\s*/, '').trim());
            if (paperText) {
                synthesizedData.논문.push(paperText);
            }
        });

        await page.click('ul.news_tab li[rel="article"]');
        await page.waitForTimeout(500);

        let articleMoreButtonVisible = true;
        while (articleMoreButtonVisible) {
            const button = await page.$('.boardBtn');
            if (button && await button.isVisible()) {
                await button.click();
                await page.waitForTimeout(500);
            } else {
                break;
            }
        }

        const articleContent = await page.content();
        const $article = cheerio.load(articleContent);
        $article('ul#tiles li').each((i, el) => {
            const text = cleanText($article(el).find('.txt').text());
            const date = cleanText($article(el).find('.date').text());
            const url = $article(el).find('a').attr('href');
            if (text) {
                synthesizedData.언론.push({ targetDate: date, type: '기사', text: text, url: url ? new URL(url, doctorData.hospital_site).href : null, issuer: null });
            }
        });

    } catch (e) {
        error = `Playwright execution failed: ${e.message}`;
        console.error(error);
        isAttend = false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    const finalResult = { ...synthesizedData, isAttend, error };
    Object.keys(finalResult).forEach(key => {
        if (Array.isArray(finalResult[key]) && finalResult[key].length === 0) {
            delete finalResult[key];
        }
    });

    return finalResult;
}

if (require.main === module) {
    const doctorFilePath = process.argv[2];
    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Error reading or parsing file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };

            if (result.error) {
                updatedDoctorData.isSearchType = 'html_playwright_failed';
                updatedDoctorData.isExist = false;
            } else {
                updatedDoctorData.isSearchType = 'html_playwright';
                updatedDoctorData.isExist = true;
            }
            updatedDoctorData.isAttend = result.isAttend;
            delete updatedDoctorData.error; // Clear previous errors on success

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`Successfully updated file: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`Critical error processing ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}
