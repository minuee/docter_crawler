const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const doctorName = process.argv[2];
  if (!doctorName) {
    console.error('Doctor name is required.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.handoh.com/sub_treatment/department_view.php?cate=0001_', { waitUntil: 'domcontentloaded' });

  const doctorData = await page.evaluate((name) => {
    const doctorElements = Array.from(document.querySelectorAll('.sub_doctors > li'));
    const doctorElement = doctorElements.find(el => {
      const nameElement = el.querySelector('.t2');
      return nameElement && nameElement.innerText.trim() === name;
    });

    if (!doctorElement) {
      return null;
    }

    const profileUrl = doctorElement.querySelector('.img_wrap img')?.src;
    const specialty = doctorElement.querySelector('.t3')?.innerText.trim();
    const historyElements = Array.from(doctorElement.querySelectorAll('.info_margin .t6'));
    
    const education = [];
    const experience = [];

    historyElements.forEach(el => {
      const text = el.innerText.replace(/^-/, '').trim();
      if (text.includes('박사') || text.includes('석사') || text.includes('학사') || text.includes('졸업')) {
        education.push({ date: null, content: text });
      } else {
        experience.push({ date: null, content: text });
      }
    });

    return {
      profileUrl,
      specialty,
      학력: education,
      경력: experience,
    };
  }, doctorName);

  if (doctorData) {
    console.log(JSON.stringify(doctorData, null, 2));
  } else {
    console.error('Doctor not found.');
  }

  await browser.close();
})();
