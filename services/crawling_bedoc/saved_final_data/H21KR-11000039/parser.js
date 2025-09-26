
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  const doctorName = process.argv[3];

  if (!url || !doctorName) {
    console.error('URL과 의사 이름을 인자로 제공해야 합니다.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const linkLocator = page.getByRole('link', { name: new RegExp(doctorName) });
    await linkLocator.first().click();

    const detailContainer = page.locator(`//a[contains(., '${doctorName}')]/following-sibling::div`).first();
    await detailContainer.waitFor({ state: 'visible', timeout: 10000 });

    const specialty = await detailContainer.locator('h5:has-text("전문분야") + div').textContent();
    const bioText = await detailContainer.locator('h5:has-text("약력 및 경력") + div').textContent();
    const papersText = await detailContainer.locator('h5:has-text("논문·책") + div').textContent();

    const education = [];
    const experience = [];
    const educationKeywords = ['대학', '석사', '박사', '연수', '졸업'];

    bioText.split('■').forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        const entry = { content: trimmedLine };
        if (educationKeywords.some(keyword => trimmedLine.includes(keyword))) {
            education.push(entry);
        } else {
            experience.push(entry);
        }
    });
    
    const papers = papersText.split('■').map(p => p.trim()).filter(p => p);

    const result = {
        specialty: specialty.replace(/■/g, '').trim(),
        "학력": education,
        "경력": experience,
        "논문": papers
    };

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
