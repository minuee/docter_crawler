
const { chromium } = require('playwright');

(async () => {
  const timeout = 2 * 60 * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const url = process.argv[2];
    const doctorName = process.argv[3];

    if (!url || !doctorName) {
      console.error('Please provide a URL and a doctor name.');
      process.exit(1);
    }

    await page.goto(url, { waitUntil: 'networkidle' });

    // All data is pre-loaded in the HTML, no click needed.
    const doctorData = await page.evaluate((name) => {
      const data = {};
      const baseUrl = document.location.origin;

      // Find the doctor's list item to determine the index
      const docListItems = Array.from(document.querySelectorAll('ul.doc_list li'));
      const doctorIndex = docListItems.findIndex(li => li.innerText.includes(name));

      if (doctorIndex === -1) {
        throw new Error(`Doctor ${name} not found in the list.`);
      }

      // The popup div ID is based on the index (e.g., element_to_pop_up_01)
      const popupId = `#element_to_pop_up_${String(doctorIndex + 1).padStart(2, '0')}`;
      const popupNode = document.querySelector(popupId);

      if (!popupNode) {
        throw new Error(`Popup div with ID ${popupId} not found.`);
      }

      // --- Extract data from the popup ---
      const profileImg = popupNode.querySelector('.top img');
      if (profileImg) {
        data.profileUrl = new URL(profileImg.src, baseUrl).href;
      }

      data.specialty = popupNode.querySelector('.top .sp_t')?.innerText.trim() || null;

      const sections = {
        '학력': [],
        '경력': [],
        '학회': [],
      };

      popupNode.querySelectorAll('.title_bar').forEach(titleBar => {
        const title = titleBar.querySelector('span').innerText.trim();
        const contentList = titleBar.nextElementSibling;
        if (contentList && contentList.classList.contains('doc_profile')) {
          const items = contentList.innerHTML.split(/<br\s*\/?>/i).map(item => item.trim()).filter(Boolean);
          if (sections.hasOwnProperty(title)) {
            sections[title] = items.map(item => ({ date: null, content: item }));
          }
        }
      });

      data.학력 = sections['학력'];
      data.경력 = sections['경력'];
      data.학술 = sections['학회']; // Renamed from 학회 to 학술 to match schema
      data.수상 = [];
      data.논문 = [];

      return data;
    }, doctorName);

    console.log(JSON.stringify(doctorData, null, 2));

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Script timed out after 2 minutes.');
    } else {
      console.error('An error occurred:', error.message);
    }
    console.log(JSON.stringify({}, null, 2));
  } finally {
    clearTimeout(timer);
    await browser.close();
  }
})();
