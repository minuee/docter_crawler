const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

async function parseDoctorProfile(doctorData) {
    const { hospital_site, bedoc_doctorname, site_type, bedoc_hospitalsite } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    let page = await context.newPage();

    let isAttend = false;
    let error = null;
    let parsedDetails = {};

    try {
        if (site_type === 'popup') {
            await page.goto(bedoc_hospitalsite, { waitUntil: 'domcontentloaded', timeout: 120000 });
            const doctorElement = await page.$(`text=${bedoc_doctorname}`);
            if (doctorElement) {
                let clickTarget = await doctorElement.$('xpath=./following-sibling::a[contains(text(), "상세보기")]') ||
                                  await doctorElement.$('xpath=./following-sibling::button[contains(text(), "상세보기")]') ||
                                  await doctorElement.$('xpath=./parent::*/a') ||
                                  await doctorElement.$('xpath=./parent::*/button') ||
                                  doctorElement;
                if (clickTarget) {
                    const [popup] = await Promise.all([
                        new Promise(resolve => context.once('page', resolve)),
                        clickTarget.click()
                    ]);
                    if (popup) {
                        page = popup;
                        await page.waitForLoadState('domcontentloaded');
                    }
                } else {
                    throw new Error(`Could not find a clickable element for doctor ${bedoc_doctorname}`);
                }
            } else {
                throw new Error(`Doctor ${bedoc_doctorname} not found on the page.`);
            }
        } else {
            await page.goto(hospital_site, { waitUntil: 'domcontentloaded', timeout: 120000 });
        }

        const clickMoreButtons = async () => {
            const maxClicks = 50;
            let clickedCount = 0;
            while (clickedCount < maxClicks) {
                let buttonFoundAndClickedThisIteration = false;
                const initialThesisCount = (await page.$('tbody#thesis tr'))?.length || 0;
                const initialBookCount = (await page.$('tbody#book tr'))?.length || 0;
                const initialGenericContentCount = (await page.$('div.info_box.infotable_box tbody tr'))?.length || 0;
                const initialNewsCount = (await page.$('div.infonews_box_list ul#news li'))?.length || 0;

                const genericMoreButton = await page.$('button:has-text("더보기"), a:has-text("더보기"), button:has-text("더보기 +"), a:has-text("더보기 +")');
                if (genericMoreButton) {
                    try {
                        await genericMoreButton.click();
                        await page.waitForFunction(
                            (counts) => 
                                (document.querySelectorAll('div.info_box.infotable_box tbody tr').length > counts.generic) ||
                                (document.querySelectorAll('div.infonews_box_list ul#news li').length > counts.news),
                            { timeout: 5000 },
                            { generic: initialGenericContentCount, news: initialNewsCount }
                        );
                        buttonFoundAndClickedThisIteration = true;
                    } catch (e) {}
                }

                const thesisMoreButton = await page.$('a.btn_gray_line[href="javascript:moreThesis();"]');
                if (thesisMoreButton) {
                    try {
                        await page.evaluate(() => moreThesis());
                        await page.waitForFunction((initialCount) => document.querySelectorAll('tbody#thesis tr').length > initialCount, { timeout: 5000 }, initialThesisCount);
                        buttonFoundAndClickedThisIteration = true;
                    } catch (e) {}
                }

                const bookMoreButton = await page.$('a[href="javascript:fnGetTreatise(\'book\');"]');
                if (bookMoreButton) {
                    try {
                        await page.evaluate(() => fnGetTreatise('book'));
                        await page.waitForFunction((initialCount) => document.querySelectorAll('tbody#book tr').length > initialCount, { timeout: 5000 }, initialBookCount);
                        buttonFoundAndClickedThisIteration = true;
                    } catch (e) {}
                }

                if (buttonFoundAndClickedThisIteration) {
                    clickedCount++;
                    await page.waitForTimeout(1000);
                } else {
                    break;
                }
            }
        };

        await clickMoreButtons();

        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);
        $('script, style, nav, header, footer, iframe, noscript').remove();
        const extractedHtml = $('body').html();

        if (extractedHtml && extractedHtml.includes(bedoc_doctorname)) {
            isAttend = true;
        }

        const doctorImgBoxStyle = $('div.doctor_imgbox.pc_show').attr('style');
        if (doctorImgBoxStyle) {
            const match = doctorImgBoxStyle.match(/url\(([^)]+)\)/);
            if (match && match[1]) {
                const relativeUrl = match[1].replace(/\\\"/g, '');
                parsedDetails.profileUrl = new URL(relativeUrl, doctorData.hospital_site).href;
            }
        }

        parsedDetails.specialty = $('p.f_l:contains("전문분야") + ul.f_l.ml15 li').text().trim();

        $('div.info_box.infotable_box').each((i, el) => {
            const title = $(el).find('h4.info_box_tit').text().trim();
            const tableRows = $(el).find('tbody tr');
            let items = [];
            tableRows.each((j, row) => {
                const date = $(row).find('th').text().trim();
                const content = $(row).find('td').text().trim();
                if (date || content) {
                    items.push({ date: date || null, content: content.replace(/"/g, '') });
                }
            });
            if (items.length > 0) {
                switch (title) {
                    case '학력': parsedDetails.학력 = items; break;
                    case '경력': parsedDetails.경력 = items; break;
                    case '활동': parsedDetails.학술 = items; break;
                    case '수상이력': parsedDetails.수상 = items; break;
                }
            }
        });

        const thesisItems = [];
        $('tbody#thesis tr').each((i, row) => {
            const content = $(row).find('td').text().trim();
            if (content) thesisItems.push(content.replace(/"/g, ''));
        });
        if (thesisItems.length > 0) parsedDetails.논문 = thesisItems;

        const bookItems = [];
        $('tbody#book tr').each((i, row) => {
            const date = $(row).find('th').text().trim();
            const content = $(row).find('td').text().trim();
            if (content) {
                bookItems.push({ date: date || null, content: content.replace(/"/g, ''), issuer: null });
            }
        });
        if (bookItems.length > 0) parsedDetails.저서 = bookItems;

        const mediaItems = [];
        $('div.infonews_box_list ul#news li').each((i, el) => {
            const link = $(el).find('a');
            const fullText = link.find('p.title').text().trim();
            const url = link.attr('href');
            const date = link.find('p.gry').last().text().trim();
            let type = null, text = fullText.replace(/"/g, ''), issuer = null;
            const newsMatch = fullText.match(/\ \[(.*?)\ \]\s*(.*)/);
            if (newsMatch) {
                issuer = newsMatch[1].trim();
                text = newsMatch[2].trim().replace(/"/g, '');
                type = '기사';
            } else if (fullText.includes('유튜브')) {
                type = '유튜브';
            }
            mediaItems.push({ targetDate: date || null, type, text, url: url || null, issuer });
        });
        if (mediaItems.length > 0) parsedDetails.언론 = mediaItems;

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }

    return { ...parsedDetails, isAttend, error };
}

if (require.main === module) {
    const doctorFilePath = process.argv[2];
    if (!doctorFilePath) {
        console.error("Please provide the path to the doctor's JSON file.");
        process.exit(1);
    }

    let doctorData;
    try {
        doctorData = JSON.parse(fs.readFileSync(doctorFilePath, 'utf-8'));
    } catch (e) {
        console.error(`Failed to read or parse file: ${doctorFilePath}`);
        process.exit(1);
    }

    parseDoctorProfile(doctorData)
        .then(result => {
            const updatedDoctorData = { ...doctorData, ...result };
            updatedDoctorData.isSearchType = result.error ? 'html_playwright_failed' : 'html_playwright';
            updatedDoctorData.isExist = !result.error;
            updatedDoctorData.isAttend = result.isAttend;
            delete updatedDoctorData.error;

            fs.writeFileSync(doctorFilePath, JSON.stringify(updatedDoctorData, null, 2), 'utf-8');
            console.log(`File updated successfully: ${doctorFilePath}`);
        })
        .catch(error => {
            console.error(`A critical error occurred for ${doctorFilePath}:`, error);
            const errorData = { ...doctorData, isSearchType: 'html_playwright_failed', isExist: false, error: error.message };
            fs.writeFileSync(doctorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
        });
}