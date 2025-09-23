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

  const papersData = await page.evaluate(() => {
    const papers = [];
    const rows = document.querySelectorAll('table.list_tbl tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 3) {
        const year = cells[0].innerText.trim();
        const title = cells[1].innerText.trim();
        const journal = cells[2].innerText.trim();
        // Format: "Title (JOURNAL, YEAR)"
        papers.push(`${title} (${journal}, ${year})`);
      }
    });
    
    return { 논문: papers };
  });

  console.log(JSON.stringify(papersData, null, 2));

  await browser.close();
})();