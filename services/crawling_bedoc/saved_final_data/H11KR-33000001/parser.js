
const { chromium } = require('playwright');
const cheerio = require('cheerio');

const doctorName = process.argv[2];
const deptName = process.argv[3];
const url = process.argv[4];

if (!doctorName || !deptName || !url) {
  console.error('Please provide doctor name, department name, and URL as command-line arguments.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const responsePromise = page.waitForResponse(res => res.url().includes('doctorDetailPopAjax.do'));

    await page.goto(url, { waitUntil: 'networkidle' });

    const doctorLi = await page.locator(`li:has(strong:has-text("${doctorName}"))`);
    if (await doctorLi.count() === 0) {
        throw new Error(`Could not find list item for doctor ${doctorName}`);
    }

    const profileButton = doctorLi.locator('a.pro_sview');
    if (await profileButton.count() === 0) {
        throw new Error(`Could not find profile button for doctor ${doctorName}`);
    }

    await profileButton.click();

    const response = await responsePromise;
    const htmlContent = await response.text();
    const $ = cheerio.load(htmlContent);

    const extractedData = {};

    const profileUrl = $('.profile_area img').attr('src');
    if (profileUrl) {
        extractedData.profileUrl = new URL(profileUrl, url).href;
    }

    const specialty = $('.pro_info dl dd').first().text().trim();
    if (specialty) {
        extractedData.specialty = specialty;
    }

    const eduKeywords = ['석사', '박사', 'ECFMG'];
    const careerKeywords = ['수료', '과장', '교수', '소장'];

    $('h3.doc').each((i, h3) => {
        const title = $(h3).text().trim();
        const listItems = $(h3).next('ul.list').find('li').map((j, li) => $(li).text().trim()).get();

        if (title.includes('학력 / 경력')) {
            extractedData.학력 = listItems.filter(item => eduKeywords.some(kw => item.includes(kw))).map(item => ({ content: item }));
            extractedData.경력 = listItems.filter(item => careerKeywords.some(kw => item.includes(kw)) || !eduKeywords.some(kw => item.includes(kw))).map(item => ({ content: item }));
        } else if (title.includes('주요활동')) {
            extractedData.학술 = listItems.map(item => ({ content: item }));
        } else if (title.includes('연구 / 저서')) {
            extractedData.논문 = listItems; // Simple array of strings for papers/books
        }
    });

    console.log(JSON.stringify(extractedData, null, 2));

  } catch (error) {
    console.error('An error occurred during parsing:', error);
    console.log(JSON.stringify({ error: error.message }));
  } finally {
    await browser.close();
  }
})();
