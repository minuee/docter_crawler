
const { chromium } = require('playwright');
const cheerio = require('cheerio');

const doctorName = process.argv[2];
const deptName = process.argv[3];
const url = process.argv[4];

if (!doctorName || !deptName || !url) {
  console.error('Please provide doctor name, department name, and URL as command-line arguments.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const responsePromise = page.waitForResponse(res => res.url().includes('proc/doctor_info.php') && res.status() === 200);

    await page.goto(url, { waitUntil: 'networkidle' });

    // Click the 'Medical Staff' tab to make the list visible
    await page.click('.tab2[data-id="sec2"]');
    await page.waitForSelector('span.prd.sec2.on', { timeout: 5000 }); // Wait for tab content to be visible

    // Use a robust XPath to find the button relative to the doctor's name
    const buttonXPath = `//span[@class="doct_name_bold" and contains(text(), "${doctorName}")]/ancestor::tr[1]/following-sibling::tr[1]//input[@value="의료진 소개"]`;
    const detailButton = await page.locator(buttonXPath);

    if (await detailButton.count() === 0) {
        throw new Error(`Could not find the details button for doctor ${doctorName} using XPath.`);
    }

    await detailButton.click();

    const response = await responsePromise;
    const data = await response.json();

    const extractedData = {};

    if (data.drphoto) {
        extractedData.profileUrl = new URL(data.drphoto, url).href;
    }
    if (data.drspec) {
        extractedData.specialty = data.drspec;
    }

    const parseTextToArray = (text) => {
        if (!text) return [];
        return text.split(/\r\n|\n/).filter(line => line.trim() !== '').map(line => ({ content: line.trim() }));
    };
    
    const parsePapersToArray = (text) => {
        if (!text) return [];
        return text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    };

    extractedData.학력 = parseTextToArray(data.drtxt1);
    extractedData.경력 = parseTextToArray(data.drtxt2);
    extractedData.학술 = parseTextToArray(data.drtxt3);
    extractedData.논문 = parsePapersToArray(data.drtxt5);

    if (data.board && data.board.length > 0) {
        extractedData.언론 = data.board.map(item => ({
            targetDate: item.date,
            type: '기사', // Assuming type is 'article'
            text: item.title,
            url: item.url
        }));
    }
    
    // Remove empty arrays
    for (const key in extractedData) {
        if (Array.isArray(extractedData[key]) && extractedData[key].length === 0) {
            delete extractedData[key];
        }
    }

    console.log(JSON.stringify(extractedData, null, 2));


  } catch (error) {
    console.error('An error occurred during parsing:', error);
    console.log(JSON.stringify({ error: error.message }));
  } finally {
    await browser.close();
  }
})();
