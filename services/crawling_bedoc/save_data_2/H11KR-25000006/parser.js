
const { chromium } = require('playwright');
const cheerio = require('cheerio');

const url = process.argv[2];

if (!url) {
  console.error('Please provide a URL as a command-line argument.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const extractedData = {
      학력: [],
      경력: [],
      학술: []
    };

    // Extract profile image
    const profileUrl = $('.doctor-img').attr('src');
    if (profileUrl) {
      extractedData.profileUrl = new URL(profileUrl, url).href;
    }

    // Extract specialty
    const specialty = $('h4:contains("전문진료분야")').next('div').find('p').text().trim();
    if (specialty) {
      extractedData.specialty = specialty;
    }

    // Helper function to extract and classify list items
    const processList = (title, eduKeywords, careerKeywords) => {
      const listNode = $(`h4:contains("${title}")`).next('ul');
      if (!listNode.length) return;

      const items = [];
      listNode.contents().each(function() {
        if (this.type === 'text') {
          const text = $(this).text().trim().replace(/^-/, '').trim();
          if (text) {
            items.push(text);
          }
        }
      });

      items.forEach(item => {
        if (title === '주요약력') {
          if (eduKeywords.some(kw => item.includes(kw))) {
            extractedData.학력.push({ content: item });
          } else {
            extractedData.경력.push({ content: item });
          }
        } else if (title === '학회') {
          extractedData.학술.push({ content: item });
        }
      });
    };

    const eduKeywords = ['졸업'];
    const careerKeywords = ['교수'];

    processList('주요약력', eduKeywords, careerKeywords);
    processList('학회', [], []);

    // Remove empty arrays
    for (const key in extractedData) {
        if (Array.isArray(extractedData[key]) && extractedData[key].length === 0) {
            delete extractedData[key];
        }
    }

    console.log(JSON.stringify(extractedData, null, 2));

  } catch (error) {
    console.error('An error occurred during parsing:', error);
    console.log(JSON.stringify({ error: error.message }));
  } finally {
    await browser.close();
  }
})();
