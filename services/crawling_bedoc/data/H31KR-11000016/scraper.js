
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function chaSeoulStationScraper(doctorData) {
  console.log(`[CUSTOM] Scraping ${doctorData.bedoc_doctorname} at ${doctorData.hospital_site}`);
  const { hospital_site, bedoc_doctorname, bedoc_deptname, aiga_hid } = doctorData;
  const dataDir = path.join(global.appRoot, 'services', 'crawling_bedoc', 'data', aiga_hid);
  if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }
  const jsonFilePath = path.join(dataDir, `${bedoc_doctorname}.json`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(hospital_site, { waitUntil: 'networkidle2', timeout: 20000 });
    const content = await page.content();
    const $ = cheerio.load(content);

    let isExist = false;
    $('.medical_slider .list').each(function() {
        const name = $(this).find('.name').text().trim().replace('교수','').trim();
        if (name === bedoc_doctorname) {
            isExist = true;
            return false; // break loop
        }
    });

    if (!isExist) {
      console.log(`[WARN] Doctor ${bedoc_doctorname} not found on the page. Marking as isExist: false.`);
      const notFoundData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname };
      fs.writeFileSync(jsonFilePath, JSON.stringify(notFoundData, null, 2));
      return { success: true, data: notFoundData };
    }

    // Placeholder for actual scraping logic if doctor is found
    const scrapedData = {
      isExist: true,
      doctorName: bedoc_doctorname,
      department: bedoc_deptname,
      profileUrl: hospital_site,
      specialty: '',
      education: [],
      experience: [],
      thesis: []
    };

    fs.writeFileSync(jsonFilePath, JSON.stringify(scrapedData, null, 2));
    console.log(`[SUCCESS] Saved custom-scraped data to ${jsonFilePath}`);
    return { success: true, data: scrapedData };

  } catch (error) {
    console.error(`[ERROR] Custom scraper for ${bedoc_doctorname} failed:`, error.message);
    const errorData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname, error: error.message };
    fs.writeFileSync(jsonFilePath, JSON.stringify(errorData, null, 2));
    return { success: false, data: null };
  } finally {
    if (browser && browser.isConnected()) { await browser.close(); }
  }
}

module.exports = chaSeoulStationScraper;
