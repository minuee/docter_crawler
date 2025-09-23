const { chromium } = require('playwright');

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node parser.js <doctorDataJsonString>');
        process.exit(1);
    }

    const doctorData = JSON.parse(process.argv[2]);
    const { hospital_site, bedoc_doctorname } = doctorData;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let result = {};
    let error = null;

    try {
        await page.goto(hospital_site, { waitUntil: 'networkidle', timeout: 60000 });

        // Corrected: Pass arguments as a single object
        result = await page.evaluate(({ docName, baseSiteUrl }) => {
            const synthesizedData = {
                isAttend: false,
                profileUrl: null,
                specialty: null,
                학력: [],
                경력: [],
                학술: [],
                논문: [],
            };

            // Clean text helper
            const cleanText = (text) => text ? text.replace(/\s+/g, ' ').replace(/"/g, '').trim() : '';

            // isAttend check
            if (document.body.innerText.includes(docName)) {
                synthesizedData.isAttend = true;
            }

            // Profile URL
            const imgEl = document.querySelector('.doctor_view_v2 .img_box img');
            if (imgEl) {
                const src = imgEl.getAttribute('src');
                if (src) {
                     synthesizedData.profileUrl = src.startsWith('http') ? src : new URL(src, baseSiteUrl).href;
                }
            }

            // Specialty
            const specialtyEl = Array.from(document.querySelectorAll('strong')).find(el => el.textContent.includes('전문진료분야'));
            if (specialtyEl) {
                synthesizedData.specialty = cleanText(specialtyEl.parentElement.textContent.replace('전문진료분야', ''));
            }

            // Categorize mixed list
            const careerHeader = Array.from(document.querySelectorAll('h4')).find(el => el.textContent.includes('경력'));
            if (careerHeader) {
                const list = careerHeader.nextElementSibling;
                if (list && list.tagName === 'UL') {
                    list.querySelectorAll('li').forEach(li => {
                        const text = cleanText(li.textContent);
                        if (!text) return;

                        if (text.includes('졸업') || text.includes('박사') || text.includes('석사')) {
                            synthesizedData.학력.push({ date: null, content: text });
                        } else if (text.includes('학회') || text.includes('이사장') || text.includes('부회장')) {
                            synthesizedData.학술.push({ date: null, content: text });
                        } else if (text.includes('논문')) {
                            synthesizedData.논문.push(text);
                        } else {
                            synthesizedData.경력.push({ date: null, content: text });
                        }
                    });
                }
            }

            return synthesizedData;
        }, { docName: bedoc_doctorname, baseSiteUrl: hospital_site });

    } catch (e) {
        error = `Error during Playwright execution: ${e.message}`;
    } finally {
        await browser.close();
    }

    console.log(JSON.stringify({ ...result, error }));
}

main();