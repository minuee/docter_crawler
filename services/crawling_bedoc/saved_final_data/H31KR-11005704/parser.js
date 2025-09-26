const { chromium } = require('playwright');
const fs = require('fs');

async function parse(url, doctorName) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle' });

        const data = await page.evaluate((doctorName) => {
            const doctorWraps = Array.from(document.querySelectorAll('.doctor_wrap'));
            const doctorInfo = {};

            for (const wrap of doctorWraps) {
                const nameElement = wrap.querySelector('.txt42');
                if (nameElement && nameElement.innerText.replace(/\s/g, '').includes(doctorName.replace(/\s/g, ''))) {
                    const profileImage = wrap.querySelector('img');
                    if (profileImage) {
                        const src = profileImage.getAttribute('src');
                        if (src.startsWith('http')) {
                            doctorInfo.profileUrl = src;
                        } else {
                            doctorInfo.profileUrl = `https://www.cbkps.com${src}`;
                        }
                    }

                    const specialtyElement = wrap.querySelector('.txt20.gray');
                    if (specialtyElement) {
                        const specialtyMatch = specialtyElement.innerHTML.match(/\[(.*?)\]/);
                        doctorInfo.specialty = specialtyMatch ? specialtyMatch[1] : '';
                    }

                    const paragraphs = Array.from(wrap.querySelectorAll('.txt18'));
                    let education = [];
                    let experience = [];
                    let awards = [];

                    paragraphs.forEach(p => {
                        const lines = p.innerHTML.split('<br>').map(line => line.trim().replace(/•/g, '').replace(/\s+/g, ' ').trim()).filter(line => line);
                        lines.forEach(line => {
                            if (line.includes('대학') || line.includes('석사') || line.includes('박사') || line.includes('수료') || line.includes('전문의') || line.includes('연수')) {
                                education.push({ content: line });
                            } else if (line.includes('상') || line.includes('훈장')) {
                                awards.push({ content: line });
                            } else {
                                experience.push({ content: line });
                            }
                        });
                    });

                    doctorInfo.학력 = education;
                    doctorInfo.경력 = experience;
                    doctorInfo.수상 = awards;
                    break; // Found the doctor, exit loop
                }
            }

            return doctorInfo;
        }, doctorName);

        return { success: true, data };
    } catch (error) {
        console.error(`Error in parser: ${error.message}`);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    (async () => {
        const url = process.argv[2];
        const doctorName = process.argv[3];
        if (!url || !doctorName) {
            console.error('Please provide a URL and a doctor name as arguments.');
            process.exit(1);
        }
        const result = await parse(url, doctorName);
        if (result.success) {
            console.log(JSON.stringify(result.data, null, 2));
        }
    })();
}

module.exports = { parse };