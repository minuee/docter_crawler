const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('URL is required.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Changed to networkidle for more reliability
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();
    const $ = cheerio.load(html);

    const synthesizedData = {
      profileUrl: null,
      specialty: null,
      '학력': [],
      '경력': [],
      '학술': [],
      '논문': [],
    };

    // Profile URL
    const profileImgSrc = $('.dPic img').attr('src');
    if (profileImgSrc) {
      synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
    }

    // Specialty
    synthesizedData.specialty = $('.viewTit li:contains("전문진료분야") p').text().trim();

    // Find section headers and process content
    $('h3').each((i, el) => {
      const title = $(el).text().trim();
      const listCont = $(el).next('.listCont');

      if (title === '학력 및 경력') {
        listCont.find('p').each((j, p_el) => {
          const text = $(p_el).text().trim();
          if (!text) return;

          if (text.includes('졸업') || text.includes('석사') || text.includes('박사')) {
            synthesizedData['학력'].push({ date: null, content: text });
          } else {
            synthesizedData['경력'].push({ date: null, content: text });
          }
        });
      } else if (title === '학회 및 활동') {
        listCont.find('p').each((j, p_el) => {
          const text = $(p_el).text().trim();
          if (text) {
            synthesizedData['학술'].push({ date: null, content: text });
          }
        });
      } else if (title === '논문') {
        const papersHtml = listCont.html();
        if (papersHtml) {
          const papers = papersHtml.split('<br>').map(line => cheerio.load(line).text().trim().replace(/^\d+\)\s*/, ''));
          synthesizedData['논문'] = papers.filter(p => p);
        }
      }
    });

    console.log(JSON.stringify(synthesizedData, null, 2));

  } catch (e) {
    console.error('Error during parsing:', e.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();