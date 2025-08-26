const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function nationalRehabScraper(doctorData) {
  console.log(`[CUSTOM] Scraping ${doctorData.bedoc_doctorname} from local HTML file.`);
  const { hospital_site, bedoc_doctorname, bedoc_deptname, aiga_hid } = doctorData;
  const dataDir = path.join(global.appRoot, 'services', 'crawling_bedoc', 'data', aiga_hid);
  const jsonFilePath = path.join(dataDir, `${bedoc_doctorname}.json`);
  const profileHtmlPath = path.join(dataDir, `${bedoc_doctorname}_profile.html`);

  try {
    if (!fs.existsSync(profileHtmlPath)) {
      const errorMsg = `Profile HTML file not found at ${profileHtmlPath}`;
      console.error(`[ERROR] ${errorMsg}`);
      const errorData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname, error: errorMsg };
      fs.writeFileSync(jsonFilePath, JSON.stringify(errorData, null, 2));
      return { success: false, data: errorData };
    }

    const content = fs.readFileSync(profileHtmlPath, 'utf-8');
    const $ = cheerio.load(content);

    const doctorNameInPage = $('span.mtip_name').text().trim();
    if (!doctorNameInPage || !doctorNameInPage.includes(bedoc_doctorname)) {
      console.log(`[WARN] Doctor ${bedoc_doctorname} not found on the page. Marking as isExist: false.`);
      const notFoundData = { isExist: false, doctorName: bedoc_doctorname, department: bedoc_deptname };
      fs.writeFileSync(jsonFilePath, JSON.stringify(notFoundData, null, 2));
      return { success: true, data: notFoundData };
    }

    // --- New, more robust scraping logic ---

    const departmentInPage = $('p.doc_major span').text().trim();
    
    // More specific selector for specialty
    const specialty = $('.doc_profile dt:contains("진료분야")').next('dd').text().trim();

    const education = [];
    const experience = [];

    // Iterate through each article section to reliably distinguish education from experience.
    $('div.sub_article').each((i, article) => {
        const title = $(article).find('h4.sub_article_title').text().trim();
        const listItems = $(article).find('ul.sub_article_list li');

        if (title === '주요학력') {
            listItems.each((j, item) => {
                education.push({ date: null, content: $(item).text().trim() });
            });
        } else if (title === '주요경력') {
            listItems.each((j, item) => {
                experience.push({ date: null, content: $(item).text().trim() });
            });
        }
    });

    const scrapedData = {
      isExist: true,
      doctorName: doctorNameInPage || bedoc_doctorname,
      department: departmentInPage || bedoc_deptname,
      profileUrl: hospital_site,
      specialty: specialty,
      education: education,
      experience: experience,
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
  }
}

module.exports = nationalRehabScraper;