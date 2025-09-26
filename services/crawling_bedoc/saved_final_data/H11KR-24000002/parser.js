
const { chromium } = require('playwright');
const cheerio = require('cheerio');

// This script is designed to be executed with command-line arguments.
// Example: node parser.js "Doctor Name" "Department Name" "URL"
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
    // Listen for the specific AJAX response that contains the doctor's details
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/user/sub2020/get_doctor_content') && response.status() === 200
    );

    await page.goto(url, { waitUntil: 'networkidle' });

    const doctorBoxes = await page.$$('.staff_list .box');
    let found = false;

    for (const box of doctorBoxes) {
      const nameEl = await box.$('.txt .name .f32');
      const deptEl = await box.$('.txt .name .f20');

      if (nameEl && deptEl) {
        const name = await nameEl.textContent();
        const dept = await deptEl.textContent();

        if (name.trim() === doctorName && dept.trim() === deptName) {
          const detailButton = await box.$('.button_wrap .detail_btn');
          if (detailButton) {
            await detailButton.click();
            found = true;
            break;
          }
        }
      }
    }

    if (!found) {
      throw new Error(`Doctor "${doctorName}" in department "${deptName}" not found on the page.`);
    }

    // Wait for the AJAX response to be received
    const response = await responsePromise;
    const responseData = await response.json(); // The response is JSON which contains an HTML string

    if (responseData.status !== 'OK' || !responseData.data) {
        throw new Error('Failed to get doctor details from AJAX response.');
    }

    const htmlContent = responseData.data;
    const $ = cheerio.load(htmlContent);

    const extractedData = {};

    // Extract profile image URL
    const profileUrl = $('.top_info .image img').attr('src');
    if (profileUrl) {
      extractedData.profileUrl = new URL(profileUrl, url).href;
    }

    // Extract specialty
    const specialty = $('.top_info .txt_wrap ul li:first-child .f20').text().trim();
    if (specialty) {
      extractedData.specialty = specialty;
    }

    // Helper function to extract list items under a specific title
    const extractHistory = (title) => {
      const items = [];
      $(`.tab_conn .f24:contains('${title}')`).next('ul.bullet_txt').find('li').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          // Split year and content
          const yearMatch = text.match(/^<strong>(\d{4})<\/strong>(.*)/);
          if (yearMatch) {
            items.push({ date: yearMatch[1].trim(), content: yearMatch[2].trim() });
          } else {
            items.push({ content: text });
          }
        }
      });
      return items;
    };
    
    const extractAcademicList = (title) => {
        const items = [];
        $(`.tab_conn .f28:contains('${title}')`).next('ul.bullet_txt').find('li').each((i, elem) => {
            const text = $(elem).text().trim();
            if(text && text !== '-논문-') {
                items.push(text);
            }
        });
        return items;
    }

    const education = extractHistory('학력');
    if (education.length > 0) {
      extractedData.학력 = education;
    }

    const career = extractHistory('경력');
    if (career.length > 0) {
      extractedData.경력 = career;
    }
    
    const academic = extractAcademicList('학술활동');
    if (academic.length > 0) {
        extractedData.학술 = academic.map(item => ({ content: item }));
    }
    
    const papers = extractAcademicList('논문 및 기타');
    if (papers.length > 0) {
        extractedData.논문 = papers;
    }

    console.log(JSON.stringify(extractedData, null, 2));

  } catch (error) {
    console.error('An error occurred during parsing:', error);
    // Output an empty JSON object to signify failure but maintain structure
    console.log(JSON.stringify({ error: error.message }));
  } finally {
    await browser.close();
  }
})();
