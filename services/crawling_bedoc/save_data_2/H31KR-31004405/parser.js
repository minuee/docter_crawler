const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  const doctorName = process.argv[3];

  if (!url || !doctorName) {
    console.error('Please provide a URL and a doctor name as command-line arguments.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.click(`//a[normalize-space()='의료진 소개' and ancestor::*[contains(., '${doctorName}')]]`)
  ]);

  await popup.waitForLoadState();
  await new Promise(resolve => setTimeout(resolve, 2000));

  const doctorData = {};
  const baseUrl = 'https://www.shhosp.co.kr';

  // --- Basic Info ---
  const basicInfo = await popup.evaluate((baseUrl) => {
    const info = {};
    const profileImg = document.querySelector('div.doc_img_wrap img');
    if (profileImg && profileImg.src) {
        info.profileUrl = new URL(profileImg.src, baseUrl).href;
    }
    const specialtyDt = Array.from(document.querySelectorAll('dl.doc_depth dt')).find(dt => dt.textContent.trim() === '전문진료분야');
    if (specialtyDt) {
        info.specialty = specialtyDt.nextElementSibling.textContent.trim();
    }
    return info;
  }, baseUrl);
  Object.assign(doctorData, basicInfo);

  // --- 학력/경력 (Tab 1) ---
  await popup.click("//a[contains(@onclick, \"fn_MoveTap('1')\")]");
  await popup.waitForLoadState();
  const eduCar = await popup.evaluate(() => {
    const edu = [];
    const car = [];
    const educationHeader = Array.from(document.querySelectorAll('.tab_box_c01 .education_wrap h4')).find(h4 => h4.textContent.trim() === '학력/경력');
    if (educationHeader) {
        const listItems = educationHeader.nextElementSibling.querySelectorAll('li');
        listItems.forEach(li => {
            const content = li.textContent.trim();
            if (content.includes('졸업') || content.includes('석사') || content.includes('박사')) {
                edu.push({ date: null, content });
            } else {
                car.push({ date: null, content });
            }
        });
    }
    return { 학력: edu, 경력: car };
  });
  Object.assign(doctorData, eduCar);

  // --- 학술활동 (Tab 2) ---
  await popup.click("//a[contains(@onclick, \"fn_MoveTap('2')\")]");
  await popup.waitForLoadState();
  const academic = await popup.evaluate(() => {
      const items = [];
      const listItems = document.querySelectorAll('.tab_box_c02 .education_wrap .bul_ty1 li');
      listItems.forEach(li => items.push({ date: null, content: li.textContent.trim() }));
      return { 학술: items };
  });
  Object.assign(doctorData, academic);

  // --- 언론보도 (Tab 3) ---
  await popup.click("//a[contains(@onclick, \"fn_MoveTap('3')\")]");
  await popup.waitForLoadState();
  const media = await popup.evaluate(() => {
      const items = [];
      const rows = document.querySelectorAll('.tab_box_c03 .list_table tbody tr');
      rows.forEach(row => {
          const titleCell = row.querySelector('td.lft_td a');
          const dateCell = row.querySelector('td:last-child');
          if (titleCell) {
              const onclickAttr = titleCell.getAttribute('onclick');
              let url = null;
              if (onclickAttr) {
                  const urlMatch = onclickAttr.match(/fn_PopPress\(\'(.*?)\'\)/);
                  if (urlMatch && urlMatch[1]) {
                      url = urlMatch[1];
                  }
              }
              items.push({
                  targetDate: dateCell ? dateCell.textContent.trim() : null,
                  text: titleCell.textContent.trim(),
                  url: url
              });
          }
      });
      return { 언론: items };
  });
  Object.assign(doctorData, media);

  // --- 논문 (Tab 5) ---
  await popup.click("//a[contains(@onclick, \"fn_MoveTap('5')\")]");
  await popup.waitForLoadState();
  const papers = await popup.evaluate(() => {
      const items = [];
      const listItems = document.querySelectorAll('.tab_box_c05 .education_wrap .bul_ty1 li');
      listItems.forEach(li => {
          const content = li.textContent.trim();
          if(content) items.push(content);
      });
      return { 논문: items };
  });
  Object.assign(doctorData, papers);

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();
