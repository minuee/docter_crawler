
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const doctorName = process.argv[2];
  if (!doctorName) {
    console.error('Please provide the doctor name as an argument.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.stmaryone.com/html/about/doctor.php', { waitUntil: 'networkidle' });

  const doctorData = await page.evaluate((name) => {
    const result = {};
    const doctorItems = document.querySelectorAll('.doctor_item');

    doctorItems.forEach(item => {
      const h2 = item.querySelector('h2');
      if (h2 && h2.innerText.includes(name)) {
        // Profile URL
        const profileImg = item.querySelector('.doctor_profile .image img.pc');
        result.profileUrl = profileImg ? profileImg.src : null;

        // Specialty
        const specialtyP = item.querySelector('.doctor_subject .subject_txt p');
        result.specialty = specialtyP ? specialtyP.innerText.trim() : null;

        // Education and Career
        const careerDiv = item.querySelector('.doctor_career .txt .left');
        if (careerDiv) {
          const lines = careerDiv.innerHTML.split('<br>').map(line => line.replace(/·/g, '').trim());
          const education = [];
          const career = [];

          lines.forEach(line => {
            if (line) {
              if (line.includes('박사') || line.includes('석사') || line.includes('학사') || line.includes('졸업')) {
                education.push({ date: null, content: line });
              } else {
                career.push({ date: null, content: line });
              }
            }
          });
          result['학력'] = education;
          result['경력'] = career;
        }
      }
    });
    return result;
  }, doctorName);

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();
