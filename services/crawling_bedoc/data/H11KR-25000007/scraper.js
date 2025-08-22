const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function cmcdjScraper(doctorData) {
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

    const specialty = $('.doctor-detail-part dd').text().trim();
    
    const rawCareer = [];
    $('#tab-career ul li').each((i, el) => {
      rawCareer.push($(el).text().trim());
    });

    const career = [];
    const education = [];
    const educationKeywords = ['석사', '박사', '졸업', '학사', '수료', '의학대학원', '의과대학'];
    const careerKeywords = ['임상교수', '소장', '과장', '연수', '정회원'];

    rawCareer.forEach(item => {
      let isEducation = false;
      let isCareer = false;

      for (const keyword of educationKeywords) {
        if (item.includes(keyword)) {
          isEducation = true;
          break;
        }
      }

      for (const keyword of careerKeywords) {
        if (item.includes(keyword)) {
          isCareer = true;
          break;
        }
      }

      if (isEducation && !isCareer) {
        education.push({ date: null, content: item });
      } else {
        let extractedDate = null;
        let contentWithoutDate = item;

        const yearInParenthesesMatch = item.match(/\((\d{4})\)/);
        if (yearInParenthesesMatch) {
          extractedDate = yearInParenthesesMatch[1];
          contentWithoutDate = item.replace(/\s*\((\d{4})\)/, '').trim();
        } else {
          const yearAtStartMatch = item.match(/^(\d{4})\s*[-–]?\s*(.*)/);
          if (yearAtStartMatch && yearAtStartMatch[1].length === 4) {
            extractedDate = yearAtStartMatch[1];
            contentWithoutDate = yearAtStartMatch[2].trim();
          }
        }
        
        career.push({ date: extractedDate, content: contentWithoutDate });
      }
    });

    const thesis = [];
    $('#tab-thesis-add ul li').each((i, el) => {
      thesis.push($(el).text().trim());
    });

    const scrapedData = {
      isExist: true,
      doctorName: $('.doctor-detail-name').text().trim(),
      department: $('.doctor-detail-dept').text().trim(),
      profileUrl: hospital_site,
      specialty: specialty,
      education: education,
      experience: career,
      thesis: thesis,
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

module.exports = cmcdjScraper;