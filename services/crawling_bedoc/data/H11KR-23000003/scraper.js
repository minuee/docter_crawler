
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function daeguDongsanScraper(doctorData) {
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

    const isExist = !$('body').text().includes('찾으시는 검색어를 입력하세요');

    if (!isExist) {
      console.log(`[WARN] Doctor ${bedoc_doctorname} not found on the page. Marking as isExist: false.`);
      const notFoundData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname };
      fs.writeFileSync(jsonFilePath, JSON.stringify(notFoundData, null, 2));
      return { success: true, data: notFoundData };
    }

    const doctorNameInPage = $('.doc_info_wrap .doc_name strong').text().trim();
    const departmentInPage = $('.doc_info_wrap .doc_name span').text().trim();
    
    const specialty = [];
    $('.doc_info_wrap .doc_info_list li').eq(0).find('p').each((i, el) => {
        specialty.push($(el).text().trim());
    });
    
    const education = [];
    $('.doc_info_wrap .doc_info_list li').eq(1).find('p').each((i, el) => {
        education.push({ date: null, content: $(el).text().trim() });
    });
    
    const experience = [];
    $('.doc_info_wrap .doc_info_list li').eq(2).find('p').each((i, el) => {
        experience.push({ date: null, content: $(el).text().trim() });
    });

    const scrapedData = {
      isExist: true,
      doctorName: doctorNameInPage || bedoc_doctorname,
      department: departmentInPage || bedoc_deptname,
      profileUrl: hospital_site,
      specialty: specialty.join(', '),
      education,
      experience,
      thesis: [] // Thesis field not obvious on the page
    };

    fs.writeFileSync(jsonFilePath, JSON.stringify(scrapedData, null, 2));
    console.log(`[SUCCESS] Saved custom-scraped data to ${jsonFilePath}`);
    return { success: true, data: scrapedData };

  } catch (error) {
    console.error(`[ERROR] Custom scraper for ${bedoc_doctorname} failed:`, error.message);
    return { success: false, data: null };
  } finally {
    if (browser && browser.isConnected()) { await browser.close(); }
  }
}

module.exports = daeguDongsanScraper;
