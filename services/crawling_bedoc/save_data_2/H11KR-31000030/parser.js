const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('URL is required.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const doctorData = await page.evaluate(() => {
    const profileUrl = document.querySelector('.profile-item img')?.src;
    const specialty = document.querySelector('.medical-subject')?.innerText.trim();
    
    const education = [];
    document.querySelectorAll('.acdmcrMatter li').forEach(el => {
      education.push({ date: null, content: el.innerText.trim() });
    });

    const experience = [];
    document.querySelectorAll('.edcNdClincCareer li').forEach(el => {
      experience.push({ date: null, content: el.innerText.trim() });
    });

    const academic = [];
    document.querySelectorAll('.schlshpRelateCareer li').forEach(el => {
      academic.push({ date: null, content: el.innerText.trim() });
    });

    const papersLink = document.querySelector('a[href*="researcher-profile"]')?.href;

    return {
      profileUrl,
      specialty,
      학력: education,
      경력: experience,
      학술: academic,
      papersLink,
    };
  });

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();
