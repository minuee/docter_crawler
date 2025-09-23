const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as a command-line argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const doctorData = await page.evaluate(() => {
    const data = {
      학력: [],
      경력: [],
      학술: [],
      논문: []
    };

    // Profile URL
    const profileImg = document.querySelector('.doctors__profile');
    if (profileImg && profileImg.src) {
      data.profileUrl = new URL(profileImg.src).href;
    }

    // Specialty
    const specialtyEl = document.querySelector('.doctors__profile-desc');
    if (specialtyEl) {
      data.specialty = specialtyEl.textContent.trim().replace(/\s+/g, ' ');
    }

    // Helper to find a section by title and get its content
    const findSectionItems = (titleText) => {
      const allQuestions = Array.from(document.querySelectorAll('.faq-question .faq_q_title'));
      const titleEl = allQuestions.find(el => el.textContent.trim() === titleText);
      if (!titleEl) return [];
      
      const answerEl = titleEl.closest('.faq-item').querySelector('.faq-answer');
      if (!answerEl) return [];

      // For '학력 및 경력'
      if (titleText === '학력 및 경력') {
          const flexItem = answerEl.querySelector('.answer__flexitem');
          if (flexItem) {
              return flexItem.innerHTML.split('<br>').map(item => item.trim().replace(/^\.\s*/, '')).filter(Boolean);
          }
      }
      
      // For other sections with ul/li
      const listItems = answerEl.querySelectorAll('ul.custom-list li');
      return Array.from(listItems).map(li => li.textContent.trim()).filter(Boolean);
    };

    // 학력 및 경력
    const eduAndExpItems = findSectionItems('학력 및 경력');
    eduAndExpItems.forEach(item => {
      if (item.includes('졸업') || item.includes('석사') || item.includes('박사')) {
        data.학력.push({ date: null, content: item });
      } else {
        data.경력.push({ date: null, content: item });
      }
    });
    
    // 해외연수 (add to 경력)
    const overseasTrainingItems = findSectionItems('해외연수');
    overseasTrainingItems.forEach(item => {
        data.경력.push({ date: null, content: item.replace(/^\.\s*/, '') });
    });

    // 학술 (학회)
    const academicItems = findSectionItems('학회');
    academicItems.forEach(item => {
        data.학술.push({ date: null, content: item });
    });
    
    // 기타활동 (add to 학술)
    const otherActivities = findSectionItems('기타활동');
    otherActivities.forEach(item => {
        data.학술.push({ date: null, content: item });
    });

    // 논문
    const paperItems = findSectionItems('논문');
    data.논문 = paperItems;

    return data;
  });

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();