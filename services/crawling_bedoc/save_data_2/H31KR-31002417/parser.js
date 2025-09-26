const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as an argument.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();
    const $ = cheerio.load(html);

    const synthesizedData = {
      profileUrl: null,
      specialty: null,
      학력: [],
      경력: [],
      학술: [],
      저서: [],
    };

    const doctorHeading = $('h4.rtxt_title:contains("박희붕")');
    const doctorContainer = doctorHeading.closest('.img_box_rtxt');

    if (doctorContainer.length) {
      // Profile URL
      const profileImgSrc = doctorContainer.closest('.img_box').find('li:first-child img').attr('src');
      if (profileImgSrc) {
        synthesizedData.profileUrl = new URL(profileImgSrc, url).href;
      }

      // Specialty
      const specialtyText = doctorHeading.next('.rtxt_stitle').text();
      const specialtyMatch = specialtyText.match(/\(([^)]+)\)/);
      if (specialtyMatch) {
        synthesizedData.specialty = specialtyMatch[1].replace(/ /g, '').replace(/∙/g, ', ');
      }

      // Experience and Education
      const experienceP = doctorContainer.find('.s_ico_tit:contains("경력사항")').next('.s_txt');
      const experienceHtml = experienceP.html();
      if (experienceHtml) {
        experienceHtml.split('<br>').forEach(line => {
          const cleanedLine = line.replace(/-\s*/, '').trim();
          if (cleanedLine) {
            if (cleanedLine.includes('졸업') || cleanedLine.includes('석사') || cleanedLine.includes('박사') || cleanedLine.includes('연수')) {
              synthesizedData.학력.push({ content: cleanedLine, date: null });
            } else {
              synthesizedData.경력.push({ content: cleanedLine, date: null });
            }
          }
        });
      }

      // Academic Activities
      const academicP = doctorContainer.find('.s_ico_tit:contains("학회 및 학술활동")').next('.s_txt');
      const academicHtml = academicP.html();
      if (academicHtml) {
        academicHtml.split('<br>').forEach(line => {
          const cleanedLine = line.replace(/-\s*/, '').trim();
          if (cleanedLine) {
            synthesizedData.학술.push({ content: cleanedLine, date: null });
          }
        });
      }

      // Books
      const booksHeading = doctorContainer.parent().parent().find('.s_ico_tit:contains("저서")');
      const booksP = booksHeading.next('.s_txt');
      const booksHtml = booksP.html();
      if (booksHtml) {
        booksHtml.split('<br>').forEach(line => {
          const cleanedLine = line.replace(/-\s*/, '').trim();
          if (cleanedLine) {
            const parts = cleanedLine.split('–');
            const content = parts[0]?.trim();
            const issuer = parts[1]?.trim();
            synthesizedData.저서.push({ content: content, issuer: issuer || null, date: null });
          }
        });
      }
    }

    fs.writeFileSync('parser_output.json', JSON.stringify(synthesizedData, null, 2));

  } catch (error) {
    console.error('An error occurred:', error);
    fs.writeFileSync('parser_output.json', JSON.stringify({ error: error.message }, null, 2));
  } finally {
    await browser.close();
  }
})();