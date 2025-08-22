const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function ilsanChaHospitalScraper(doctorData) {
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

    let profileUrl = null;
    // 의료진 목록 페이지에서 해당 의사의 상세 프로필 링크 찾기
    $('.staff_card_list a[href*="/professor/profile.cha"]').each((i, el) => {
      const doctorNameOnPage = $(el).find('.title').text().trim().replace(' 교수', '');
      const departmentOnPage = $(el).find('.sub_title').text().trim();

      if (doctorNameOnPage === bedoc_doctorname && departmentOnPage === bedoc_deptname) {
        profileUrl = `https://ilsan.chamc.co.kr${$(el).attr('href')}`;
        return false;
      }
    });

    if (!profileUrl) {
      console.log(`[WARN] Doctor ${bedoc_doctorname} (${bedoc_deptname}) profile URL not found on list page. Marking as isExist: false.`);
      const notFoundData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname };
      fs.writeFileSync(jsonFilePath, JSON.stringify(notFoundData, null, 2));
      return { success: true, data: notFoundData };
    }

    // 상세 프로필 페이지로 이동하여 정보 추출
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    const profileContent = await page.content();
    const $$ = cheerio.load(profileContent); // <-- 이 부분을 수정합니다.

    const isExist = $$('body').text().includes(bedoc_doctorname);
    if (!isExist) {
      console.log(`[WARN] Doctor ${bedoc_doctorname} not found on the profile page. Marking as isExist: false.`);
      const notFoundData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname };
      fs.writeFileSync(jsonFilePath, JSON.stringify(notFoundData, null, 2));
      return { success: true, data: notFoundData };
    }

    // TODO: 상세 프로필 페이지에서 실제 CSS 셀렉터를 사용하여 정보 추출
    // 이 부분은 실제 상세 프로필 페이지의 HTML 구조를 보고 수정해야 합니다.
    // 현재는 추정치로 작성합니다.
    const specialty = $$('.doctor-info .specialty-field').text().trim() || 'Not found';
    
    const rawCareer = [];
    // 추정: 학력/경력 정보가 ul li 형태로 있을 경우
    $$('.career-section ul li, .education-section ul li').each((i, el) => {
      rawCareer.push($$(el).text().trim());
    });

    const career = [];
    const education = [];
    const educationKeywords = [ '석사', '박사', '졸업', '학사', '수료', '의학대학원', '의과대학' ];
    const careerKeywords = [ '임상교수', '소장', '과장', '연수', '정회원', '센터장' ];

    rawCareer.forEach(item => {
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

      let isEducation = false;
      let isCareer = false;

      for (const keyword of educationKeywords) {
        if (contentWithoutDate.includes(keyword)) {
          isEducation = true;
          break;
        }
      }

      for (const keyword of careerKeywords) {
        if (contentWithoutDate.includes(keyword)) {
          isCareer = true;
          break;
        }
      }

      if (isEducation && !isCareer) {
        education.push({ date: extractedDate, content: contentWithoutDate });
      } else {
        career.push({ date: extractedDate, content: contentWithoutDate });
      }
    });

    const thesis = [];
    // 추정: 논문 정보가 ul li 형태로 있을 경우
    $$('.thesis-section ul li, .research-info ul li').each((i, el) => {
      thesis.push($$(el).text().trim());
    });


    const scrapedData = {
      isExist: true,
      doctorName: bedoc_doctorname,
      department: bedoc_deptname,
      profileUrl: profileUrl,
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

module.exports = ilsanChaHospitalScraper;