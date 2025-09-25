const { chromium } = require('playwright');
const fs = require('fs');

async function parse(url) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const data = await page.evaluate(() => {
            let education = [];
            let experience = [];
            let specialty = '';
            let books = [];

            const profileImage = document.querySelector('img[src*="user/saveDir/awc"]');
            const profileUrl = profileImage ? profileImage.src : '';

            const careerP = document.querySelector('div[style*="height:449px"] > p');
            if (careerP) {
                const careerContent = careerP.innerHTML.split('<br>').map(line => line.trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ')).filter(line => line);
                careerContent.forEach(line => {
                    if (line.includes('졸업') || line.includes('박사') || line.includes('수료')) {
                        education.push({ content: line });
                    } else if (line.startsWith('저서:')) {
                        // Handle books separately
                        const bookTitle = line.substring(line.indexOf('<')).trim();
                        books.push({ content: bookTitle });
                    } else if (line.startsWith('<')) { // continuation of books
                        books.push({ content: line });
                    } else {
                        experience.push({ content: line });
                    }
                });
            }

            const specialtyP = document.querySelector('div[style*="height:152px"] > p');
            if (specialtyP) {
                const specialtyContent = specialtyP.innerHTML.split('<br>').map(line => line.trim()).filter(line => line);
                specialty = specialtyContent.join(', ');
            }

            return {
                profileUrl,
                specialty,
                학력: education,
                경력: experience,
                저서: books
            };
        });

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
        if (!url) {
            console.error('Please provide a URL as an argument.');
            process.exit(1);
        }
        const result = await parse(url);
        if (result.success) {
            console.log(JSON.stringify(result.data, null, 2));
        }
    })();
}

module.exports = { parse };