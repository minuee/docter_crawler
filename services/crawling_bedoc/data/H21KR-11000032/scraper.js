const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function nationalRehabScraper(doctorData) {
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

    // 사용자가 알려준 정확한 선택자로 수정
    const doctorNameInPage = $('span.mtip_name').text().trim();
    let isExist = false;
    console.log(`doctorNameInPage ${doctorNameInPage} ㅡㅡㅡ ${doctorNameInPage.includes(bedoc_doctorname)}.`);
    if (doctorNameInPage && doctorNameInPage.includes(bedoc_doctorname)) {
        isExist = true;
    }

    if (!isExist) {
      console.log(`[WARN] Doctor ${bedoc_doctorname} not found on the page. Marking as isExist: false.`);
      const notFoundData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname };
      fs.writeFileSync(jsonFilePath, JSON.stringify(notFoundData, null, 2));
      return { success: true, data: notFoundData };
    }

    // 의사 정보가 확인되었으므로, 나머지 정보 수집
    const departmentInPage = $('p.doc_major span').text().trim();
    const specialty = $('th:contains("전문분야")').next('td').text().trim();

    const education = [];
    $('h4:contains("학력")').next('ul').find('li').each((i, el) => {
        education.push({ date: null, content: $(el).text().trim() });
    });

    const experience = [];
    $('h4:contains("경력")').next('ul').find('li').each((i, el) => {
        experience.push({ date: null, content: $(el).text().trim() });
    });

    const scrapedData = {
      isExist: true,
      doctorName: doctorNameInPage || bedoc_doctorname,
      department: departmentInPage || bedoc_deptname,
      profileUrl: hospital_site,
      specialty: specialty,
      education: education,
      experience: experience,
      thesis: [] // 논문 정보는 해당 페이지에서 찾을 수 없음
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

module.exports = nationalRehabScraper;