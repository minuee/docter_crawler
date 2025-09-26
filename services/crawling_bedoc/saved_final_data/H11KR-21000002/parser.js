
const { chromium } = require('playwright');

(async () => {
  const doctorName = process.argv[2];
  if (!doctorName) {
    console.error('Please provide the doctor name as an argument.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://m.ddh.co.kr/content/%EC%A7%84%EB%A3%8C%EC%95%88%EB%82%B4/%EC%A7%84%EB%A3%8C%EA%B3%BC%EC%9D%98%EB%A3%8C%EC%A7%84?mode=view&part_no=8', { waitUntil: 'networkidle' });

  // Click on the '의료진/진료일정' tab
  await page.click('a.staff');
  await page.waitForSelector('.staff_wrap', { state: 'visible' });

  const doctorData = await page.evaluate((name) => {
    let result = {};
    const doctorContainers = document.querySelectorAll('.doc_container');

    doctorContainers.forEach(container => {
      const nameDiv = container.querySelector('.doc_name');
      if (nameDiv && nameDiv.innerText.trim() === name) {
        // Click the 'profile view' button
        const profileButton = container.querySelector('.doc_more a');
        if (profileButton) {
            profileButton.click();
        }
      }
    });

    // This part needs to be re-evaluated after the click
    return name; // Return name to indicate we found the doctor
  }, doctorName);

  // Wait for the profile section to be visible after the click
  await page.waitForTimeout(1000); // Wait for slideDown animation

  const finalData = await page.evaluate((name) => {
      let result = {};
      const doctorContainers = document.querySelectorAll('.doc_container');
      const baseUrl = 'https://m.ddh.co.kr';

      doctorContainers.forEach(container => {
          const nameDiv = container.querySelector('.doc_name');
          if (nameDiv && nameDiv.innerText.trim() === name) {
              const profileSection = container.querySelector('.profile');
              if (profileSection) {
                  // Profile URL
                  const img = container.querySelector('img.doc_pic_img');
                  result.profileUrl = img ? baseUrl + img.getAttribute('src') : null;

                  const infoItems = profileSection.querySelectorAll('ul > li');
                  let education = [];
                  let career = [];
                  let specialty = '';

                  infoItems.forEach(item => {
                      const strong = item.querySelector('strong');
                      if (!strong) return;

                      const title = strong.innerText.trim();
                      if (title === '학력') {
                          const content = item.querySelector('span').innerText.split(/,\n/).map(s => s.trim()).filter(Boolean);
                          content.forEach(c => education.push({ date: null, content: c }));
                      } else if (title === '경력') {
                          const careerItems = item.querySelectorAll('ul li');
                          careerItems.forEach(li => career.push({ date: null, content: li.innerText.trim() }));
                      } else if (title === '전문진료분야') {
                          specialty = item.querySelector('span').innerText.trim();
                      }
                  });

                  result['학력'] = education;
                  result['경력'] = career;
                  result.specialty = specialty;
              }
          }
      });
      return result;
  }, doctorName);


  console.log(JSON.stringify(finalData, null, 2));

  await browser.close();
})();
