const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Handle all dialogs automatically
  page.on('dialog', dialog => dialog.accept());

  await page.goto('http://www.beauvoice.com/pc/intro/guide.html', { waitUntil: 'domcontentloaded' });

  // Wait for a more specific element to ensure content is loaded after dialogs
  try {
    await page.waitForSelector('h3:has-text("의료진 소개")', { timeout: 60000 });
  } catch (e) {
    console.error('Timeout waiting for content to load after handling dialogs.');
    await browser.close();
    process.exit(1);
  }

  const doctorData = await page.evaluate(() => {
    const profileElement = document.querySelector('.intro_con');
    if (!profileElement) return { "학력": [], "경력": [], "논문": [] };

    const education = [];
    const experience = [];
    const papers = [];

    // Extract Education and Experience from the main list
    const historyItems = profileElement.querySelectorAll('ul.career li');
    historyItems.forEach(item => {
        const yearElement = item.querySelector('span');
        const year = yearElement ? yearElement.innerText.trim().replace(/"/g, '') : null;
        // Get text content excluding the year span
        const content = Array.from(item.childNodes).filter(node => node.nodeType === 3).map(n => n.textContent.trim()).join('');

        if (content) {
            const fullContent = content.replace(/"/g, '');
            if (fullContent.includes('졸업') || fullContent.includes('박사')) {
                education.push({ date: year, content: fullContent });
            } else {
                experience.push({ date: year, content: fullContent });
            }
        }
    });

    experience.push({ content: "현 아름다운목소리이비인후과 원장" });

    // Extract Papers
    const paperSections = profileElement.querySelectorAll('.lecture_box');
    paperSections.forEach(section => {
        const paperItems = section.querySelectorAll('li');
        paperItems.forEach(item => {
            const paperText = item.innerText.trim().replace(/"/g, '');
            if (paperText) {
                // Remove leading number/bullet
                const cleanedText = paperText.replace(/^[0-9]+\s*\.\s*/, '');
                papers.push(cleanedText);
            }
        });
    });

    return {
      "학력": education,
      "경력": experience,
      "논문": papers
    };
  });

  console.log(JSON.stringify(doctorData, null, 2));

  await browser.close();
})();