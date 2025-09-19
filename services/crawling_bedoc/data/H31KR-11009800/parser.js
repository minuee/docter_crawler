
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
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();
    const $ = cheerio.load(html);

    const extractedData = {
      profileUrl: null,
      specialty: [],
      학력: [],
      경력: [],
      학술: [],
      저서: []
    };

    // Extract profile image
    const profileImgSrc = $('.profile_photo img').attr('src');
    if (profileImgSrc) {
      extractedData.profileUrl = new URL(profileImgSrc, url).href;
    }

    // Keywords for classification
    const eduKeywords = ['졸업', '석사', '박사'];
    const careerKeywords = ['역임', '병원', '교수', '위원', '시행', '소유'];
    const academicKeywords = ['정회원', '학회'];

    let isBookSection = false;

    $('.profile_content > ul > li').each((i, elem) => {
      const text = $(elem).text().trim();
      if (!text) return;

      // Check for section titles
      if ($(elem).hasClass('txt1_bold')) {
        if (text.includes('공저')) {
          isBookSection = true;
        } else {
          isBookSection = false; // Reset for other sections like '수술경력'
        }
        return; // Don't add the title itself as data
      }

      if (isBookSection) {
        extractedData.저서.push({ content: text });
        return;
      }

      // Classify based on keywords
      if (eduKeywords.some(keyword => text.includes(keyword))) {
        extractedData.학력.push({ content: text });
      } else if (academicKeywords.some(keyword => text.includes(keyword))) {
        extractedData.학술.push({ content: text });
      } else if (careerKeywords.some(keyword => text.includes(keyword))) {
        extractedData.경력.push({ content: text });
      } else {
        // If no specific category, add to specialty as a general description
        extractedData.specialty.push(text);
      }
    });
    
    // Convert specialty array to a single string
    extractedData.specialty = extractedData.specialty.join(', ');

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
