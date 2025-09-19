
const { chromium } = require('playwright');
const fs = require('fs');

// This script is designed to be executed with command-line arguments.
// Example: node parser.js <url> <doctorName> <deptName>
const [,, url, doctorName, deptName] = process.argv;

if (!url) {
  console.error('Error: URL argument is missing.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const extractedData = await page.evaluate(() => {
      const data = {
        profileUrl: null,
        specialty: null,
        education: [],
        experience: [],
      };

      // Extract profile image URL
      const profileImg = document.querySelector('.sub0201_view_wrap .sec01 .img img');
      if (profileImg && profileImg.src) {
        data.profileUrl = new URL(profileImg.getAttribute('src'), location.href).href;
      }

      // Extract specialty
      const specialtyDiv = document.querySelector('.sub0201_view_wrap .sec01 .txt > div:not(.down_con)');
      if (specialtyDiv) {
          const specialtyItems = specialtyDiv.querySelectorAll('.dot_list li');
          if (specialtyItems.length > 0) {
            data.specialty = Array.from(specialtyItems).map(li => li.innerText.trim()).join(', ');
          }
      }


      // Extract education and experience
      const historyItems = document.querySelectorAll('#atxt0 .dot_list li');
      const eduKeywords = ['졸업', '석사', '박사'];

      historyItems.forEach(li => {
        const text = li.innerText.trim();
        if (!text) return;

        const isEducation = eduKeywords.some(keyword => text.includes(keyword));
        
        if (isEducation) {
          data.education.push({ date: null, content: text });
        } else {
          data.experience.push({ date: null, content: text });
        }
      });

      return data;
    });

    console.log(JSON.stringify(extractedData, null, 2));

  } catch (error) {
    console.error('Error during playwright execution:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
