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
  await page.goto(url, { waitUntil: 'networkidle' });

  const doctorData = await page.evaluate((doctorName) => {
    const data = {};
    const baseUrl = 'https://www.hanaromf.com';

    // Find the doctor's container .doc element
    const nameElement = Array.from(document.querySelectorAll('p.name')).find(el => el.textContent.trim() === doctorName);
    if (!nameElement) return { error: 'Doctor name not found' };

    const container = nameElement.closest('.doc');
    if (!container) return { error: 'Container .doc not found' };

    // Profile URL
    const profileImg = container.querySelector('.doc_img img');
    if (profileImg && profileImg.src) {
        data.profileUrl = new URL(profileImg.src, baseUrl).href;
    }

    // Specialty is not available on this page
    data.specialty = null;

    // Education and Career
    const listItems = container.querySelectorAll('.detail-box ul li');
    const edu = [];
    const car = [];
    listItems.forEach(li => {
        const content = li.textContent.trim();
        if (content.includes('졸업') || content.includes('석사') || content.includes('박사')) {
            edu.push({ date: null, content });
        } else {
            car.push({ date: null, content });
        }
    });

    data.학력 = edu;
    data.경력 = car;

    return data;
  }, doctorName);

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();