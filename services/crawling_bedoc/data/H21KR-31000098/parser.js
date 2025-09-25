
const { chromium } = require('playwright');
const fs = require('fs');

async function extractDoctorInfo(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // --- DEBUGGING --- 
    await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });
    const htmlContent = await page.content();
    fs.writeFileSync('debug_page.html', htmlContent);
    // --- END DEBUGGING ---

    await page.waitForSelector('#sub__doctorinfo__top__wr', { timeout: 15000 });

    const data = await page.evaluate(() => {
      const profileElement = document.querySelector('#sub__doctorinfo__top__wr img.doctor__face');
      const profileUrl = profileElement ? profileElement.src : null;

      const specialtyElement = document.querySelector('#sub__doctorinfo__top__wr .doc_category');
      const specialty = specialtyElement ? specialtyElement.textContent.trim() : null;
      
      const historyElement = document.querySelector('#sub__doctorinfo__box03 .doc_history');
      const historyHtml = historyElement ? historyElement.innerHTML : '';
      
      const historyItems = historyHtml.split('<br>').map(item => item.trim().replace(/^-/, '').trim()).filter(Boolean);
      
      const education = [];
      const experience = [];
      
      const eduKeywords = ['졸업', '박사', '석사', '학사', '의대'];
      
      historyItems.forEach(item => {
        if (eduKeywords.some(keyword => item.includes(keyword))) {
          education.push({ date: null, content: item });
        } else {
          experience.push({ date: null, content: item });
        }
      });

      return {
        profileUrl: profileUrl,
        specialty: specialty,
        '학력': education,
        '경력': experience,
      };
    });

    return data;

  } catch (error) {
    console.error('Error during playwright execution:', error);
    return { error: `Playwright Error: ${error.message}` };
  } finally {
    await browser.close();
  }
}

(async () => {
  const args = process.argv.slice(2);
  const url = args.find(arg => arg.startsWith('--url='))?.split('=')[1];

  if (!url) {
    console.error('URL is not provided. Please specify with --url=<URL>');
    process.exit(1);
  }

  const extractedData = await extractDoctorInfo(url);
  
  if (extractedData.error || (!extractedData.학력.length && !extractedData.경력.length)) {
      extractedData.isSearchType = 'html_playwright_failed';
      extractedData.isExist = false;
      if (!extractedData.error) {
        extractedData.error = "Parser could not extract education or experience.";
      }
  } else {
      extractedData.isSearchType = 'html_playwright';
      extractedData.isExist = true;
  }

  console.log(JSON.stringify(extractedData, null, 2));
})();
