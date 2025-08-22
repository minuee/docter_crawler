const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Main dispatcher function that chooses the correct scraper
async function dispatchAndCrawl(doctorData) {
  const { aiga_hid } = doctorData;
  const scraperPath = path.join(__dirname, 'data', aiga_hid, 'scraper.js');

  try {
    if (fs.existsSync(scraperPath)) {
      console.log(`[INFO] Custom parser found for ${aiga_hid}. Running custom scraper from ${scraperPath}...`);
      const customScraper = require(scraperPath);
      return customScraper(doctorData);
    } else {
      // For all other hospitals, save their HTML for later analysis and parser creation
      console.log(`[INFO] No custom parser for ${aiga_hid}. Saving HTML for analysis...`);
      return saveHtmlForAnalysis(doctorData);
    }
  } catch (error) {
    console.error(`[ERROR] Failed to load or run custom scraper for ${aiga_hid}:`, error.message);
    return saveHtmlForAnalysis(doctorData); // Fallback to saving HTML on error
  }
}






// =======================================================================================
// 3. HTML Saver (Fallback for new hospitals)
// =======================================================================================
async function saveHtmlForAnalysis(doctorData) {
  console.log(`[ANALYSIS] Saving HTML for ${doctorData.bedoc_doctorname}`);
  const { hospital_site, aiga_hid, bedoc_doctorname, bedoc_deptname } = doctorData;

  const dataDir = path.join(global.appRoot, 'services', 'crawling_bedoc', 'data', aiga_hid);
  if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }
  const jsonFilePath = path.join(dataDir, `${bedoc_doctorname}.json`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(hospital_site, { waitUntil: 'networkidle2', timeout: 20000 });

    const pageContent = await page.content();
    const debugFilePath = path.join(dataDir, `${bedoc_doctorname}_profile.html`);
    fs.writeFileSync(debugFilePath, pageContent);
    console.log(`[SUCCESS] Saved profile page HTML to ${debugFilePath}`);

    // Fallback: Simply save the HTML and create a placeholder JSON.
    // The existence of the doctor should be determined by the custom scraper later.
    const analysisData = { 
      isExist: null, // Set to null to indicate it needs to be checked by a proper scraper
      doctorName: bedoc_doctorname, 
      department: bedoc_deptname,
      message: "HTML saved for analysis. A custom scraper is needed to determine existence and extract data."
    };
    fs.writeFileSync(jsonFilePath, JSON.stringify(analysisData, null, 2));
    return { success: true, data: analysisData };
    
  } catch (error) {
    console.error(`[ERROR] Failed to save HTML for ${hospital_site}:`, error.message);
    const errorData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname, error: error.message };
    fs.writeFileSync(jsonFilePath, JSON.stringify(errorData, null, 2));
    return { success: false, data: null };
  } finally {
    if (browser && browser.isConnected()) {
      await browser.close();
    }
  }
}

module.exports = { dispatchAndCrawl };
