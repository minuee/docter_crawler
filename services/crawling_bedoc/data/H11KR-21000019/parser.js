
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as an argument.');
    process.exit(1);
  }
  await page.goto(url, { waitUntil: 'networkidle' });

  const doctorData = await page.evaluate(() => {
    const baseUrl = 'https://www.paik.ac.kr';
    const result = {};

    // Profile URL
    const profileImg = document.querySelector('.main-bg .middle-img img');
    result.profileUrl = profileImg ? baseUrl + profileImg.getAttribute('src') : null;

    // Specialty
    const specialtyP = document.querySelector('.pro-part .conte');
    result.specialty = specialtyP ? specialtyP.innerText.trim() : null;

    // Education, Career, Activities
    const tab1 = document.querySelector('#tab-1');
    if (tab1) {
      const education = [];
      const career = [];
      const activities = [];

      const eduPart = tab1.querySelector('.so-tit.a').parentElement;
      eduPart.querySelectorAll('p').forEach(p => {
        const text = p.innerText.trim();
        if (!text) return;
        if (text.includes('졸업')) {
            const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
            const date = dateMatch ? dateMatch[1] : null;
            const content = text.replace(/\d{4}-\d{2}-\d{2}/, '').trim();
            education.push({ date, content });
        } else {
            text.split(',').forEach(s => education.push({ date: null, content: s.trim() + ' 취득' }));
        }
      });

      const careerPart = tab1.querySelector('.so-tit.b').parentElement;
      careerPart.querySelectorAll('p').forEach(p => {
        const text = p.innerText.trim();
        if (!text) return;
        const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : null;
        const content = text.replace(/\d{4}-\d{2}-\d{2}/, '').trim();
        career.push({ date, content });
      });

      const activityPart = tab1.querySelector('.so-tit.c').parentElement;
      activityPart.querySelectorAll('p').forEach(p => {
          const text = p.innerText.trim();
          if(text) activities.push({ date: null, content: text });
      });

      result['학력'] = education;
      result['경력'] = career;
      result['학술'] = activities; // 주요활동 -> 학술
    }

    // Thesis and Books
    const tab2 = document.querySelector('#tab-2');
    if (tab2) {
        const publications = [];
        const books = [];
        tab2.querySelectorAll('p').forEach(p => {
            const text = p.innerText.trim();
            if(!text) return;
            if (text.startsWith('저서:')) {
                books.push({ date: null, content: text.replace('저서:', '').trim(), issuer: null });
            } else {
                publications.push(text);
            }
        });
        result['논문'] = publications;
        result['저서'] = books;
    }

    return result;
  });

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();
