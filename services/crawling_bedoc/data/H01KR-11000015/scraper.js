const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function ewhaSeoulHospitalScraper(doctorData) {
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

    const isExist = $('body').text().includes(bedoc_doctorname);
    if (!isExist) {
      console.log(`[WARN] Doctor ${bedoc_doctorname} not found on the page. Marking as isExist: false.`);
      const notFoundData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname };
      fs.writeFileSync(jsonFilePath, JSON.stringify(notFoundData, null, 2));
      return { success: true, data: notFoundData };
    }

    const specialty = $('h3.title:contains("전문 진료 분야")').parent().next('p').text().trim();

    const education = [];
    $('h4.title:contains("학력사항")').parent().next('ul.list').find('li').each((i, el) => {
      education.push({ date: null, content: $(el).text().trim() });
    });

    const experience = [];
    const expHeaders = ['교육 및 연구경력', '기타 학술 관련 경력'];
    expHeaders.forEach(headerText => {
      $(`h4.title:contains("${headerText}")`).parent().next('ul.list').find('li').each((i, el) => {
        const text = $(el).text().trim();
        const parts = text.split('|');
        if (parts.length === 2) {
          experience.push({ date: parts[0].trim().replace(/&nbsp;/g, ''), content: parts[1].trim() });
        } else {
          experience.push({ date: null, content: text });
        }
      });
    });

    const scrapedData = {
      isExist: true,
      doctorName: bedoc_doctorname,
      department: bedoc_deptname,
      profileUrl: hospital_site,
      specialty: specialty || 'Not found',
      education,
      experience,
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

module.exports = ewhaSeoulHospitalScraper;