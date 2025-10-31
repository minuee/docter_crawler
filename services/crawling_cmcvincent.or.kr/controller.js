const config = require(`${global.appRoot}/server/config/configuration`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = {


  crwalingProcess01: async (r_url) => {
    
    try {
 
      
      // Launch a headless browser
      const browser = await puppeteer.launch();
      // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      // Navigate to the website
      await page.goto(r_url);
      // Get the page content
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      let dept = [];
      console.log(`r_url: ${r_url} `);

      $('ul.medical_list').find('li').each((index, element) => {

        const deptName = $(element).find('span.back > span.office').text() ?$(element).find('span.back > span.office').text() : '';
        const tmpLink = $(element).find('span.back > span.btn-box > a').attr('href') ? $(element).find('span.back > span.btn-box > a').attr('href') : '';
        
        console.log(`deptName: ${deptName} ${tmpLink}`);

        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://www.cmcvincent.or.kr${tmpLink}`;
         
          dept.push({ 
            deptName,
            link
          });
        }
      });

      console.log(`size of dept: `,_.size(dept));
      await browser.close();
      return { error: null, data: dept };
    } catch (error) {
      console.log(`error on ${r_url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }
  },

  crwalingProcess02: async (url,deptName) => {
    let result = null, error = null, DBCode = null;
    if (functions.isEmpty(url)) {
      return { error: true, data: [] };
    }
    console.log(`link: ${url} ${deptName}`);

    try {
      const browser = await puppeteer.launch();
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      //await page.waitForSelector('.inner');
      // Navigate to the website
      await page.goto(url,{waitUntil: "domcontentloaded"});
      await page.setViewport({
          width: 1200,
          height: 800
      });

      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent); 

      const tablist = $('#tabList').attr("class");
      console.log(`tablist: ${tablist}`);

      const doctors = [];
      $('div.select_list_wrap').find('ul > li').each((index, element) => {
        const doctorName = $(element).find('div.doc_info > div > a:first-child > strong').text() ? $(element).find('div.doc_info > div > a:first-child > strong').text() : '';
        const detailLink = $(element).find('div.doc_info > div > a:first-child').attr('href') ? $(element).find('div.doc_info > div > a:first-child').attr('href') : '';
       
        const tmpLink =  "https://www.cmcvincent.or.kr" + detailLink;
        const profileUrlTmp =  $(element).find('div.doc_list_wrap').find("a:first-child").find("span > img").attr('src') ? $(element).find('div.doc_list_wrap').find("a:first-child").find("span > img").attr('src') : '';
        const profileUrl = `https://www.cmcvincent.or.kr${profileUrlTmp}`;

        console.log(`Adding doctor list: ${index} ${doctorName} ${deptName} ${detailLink} ${profileUrl}`); // 디버
        if ( !functions.isEmpty(doctorName) && !functions.isEmpty(detailLink) ) {
          const doctor = {
            doctorName,
            deptName,
            url: tmpLink,
            profileUrl
          };
          doctors.push(doctor); 
        }
      });
   
      console.log(`doctors:${doctors.length}`);
      return { error: error, data: doctors };

    } catch (error) {
      Error = error;
      console.log(`error on ${url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }


   
  },



  crwalingProcess03: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    console.log(`crwalingProcess03: ${url}`); 
   
    if (!url) {
      return { error: true, data: null };
    }
   
    try {
      const browser = await puppeteer.launch();
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      
      //await page.waitForSelector('.inner');
      // Navigate to the website
      await page.goto(url,{waitUntil: "domcontentloaded"});
      await page.setViewport({
          width: 1200,
          height: 800
      });

      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      // $(`#layer_pop_${doctor_id}`).attr('disabled', 'disabled').css('display', 'block');
      const profileImgUrl = $('div.cont_main').find("div.cont_bg").attr('data-img-1') ? $('div.cont_main').find("div.cont_bg").attr('data-img-1') : '';
      let tmpSpecialty = $('div.doc_intro_txt').find('dl > dd > a > p').text() ? $('div.doc_intro_txt').find('dl > dd > a > p').text().trim() : '';
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        profileImgUrl: `https://www.cmcvincent.or.kr/${profileImgUrl}`,
        biography: [],
      };
      //const smaple = $('#_careerContainer').find('._careerIem:first-child > td').text();
      //console.log(`_press: ${smaple}`);

      $('div.cont_main_profile').find("div:nth-child(2)").find('ul > li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('dl > dt > em').text() ? $(dtElement).find('dl > dt > em').text().trim()  : '';
        const dtText = $(dtElement).find('dl > dd > em').text()  ? $(dtElement).find('dl > dd > em').text()  : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`학력: ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "학력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('div.cont_main_profile').find("div:nth-child(3)").find('ul > li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('dl > dt > em').text() ? $(dtElement).find('dl > dt > em').text().trim()  : '';
        const dtText = $(dtElement).find('dl > dd > em').text()  ? $(dtElement).find('dl > dd > em').text()  : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`경력: ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "경력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('div.cont_main_profile').find("div:nth-child(4)").find('ul > li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('dl > dt > em').text() ? $(dtElement).find('dl > dt > em').text().trim()  : '';
        const dtText = $(dtElement).find('dl > dd > em').text()  ? $(dtElement).find('dl > dd > em').text()  : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`연수: ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "연수",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('div.cont_main_profile').find("div:nth-child(5)").find('ul > li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('dl > dt > em').text() ? $(dtElement).find('dl > dt > em').text().trim()  : '';
        const dtText = $(dtElement).find('dl > dd > em').text()  ? $(dtElement).find('dl > dd > em').text()  : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`수상: ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "수상",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('div.cont_main_profile').find("div:nth-child(6)").find('ul > li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('dl > dt > em').text() ? $(dtElement).find('dl > dt > em').text().trim()  : '';
        const dtText = $(dtElement).find('dl > dd > em').text()  ? $(dtElement).find('dl > dd > em').text()  : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`학회: ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "학회",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });
    

      $('div.cont_main_profile').find("div.s_part").find('ul > li').each((index, dtElement) => {
        
        const dtYearText =  '';
        const dtText = $(dtElement).find('dl > dd > em').text()  ? $(dtElement).find('dl > dd > em').text()  : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`연구분야: ${tmpText}`)
          item.biography.push({
            targetDate : dtYearText,
            type: "연구분야",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('div.book_list').find("div.list_wrap").find('ul > li').each((index, dtElement) => {
        
        const dtYearText =  $(dtElement).find('div.date_wrap > span > em').text()  ? $(dtElement).find('div.date_wrap > span > em').text().trim()  : '';
        const dtText = $(dtElement).find('div.info_wrap').find("div.title > p").text()  ? $(dtElement).find('div.info_wrap').find("div.title > p").text() : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`저서: ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "저서",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('div.news_list').find("div.item_wrap").find('div.grid-item').each((index, dtElement) => {
        
        const dtYearText =  $(dtElement).find('a > div.info_wrap').find('em.date').text()  ? $(dtElement).find('a > div.info_wrap').find('em.date').text().trim()  : '';
        const dtText = $(dtElement).find('a > div.cont_wrap > p').text() ? $(dtElement).find('a > div.cont_wrap > p').text() : '';
        const dtUrl = $(dtElement).find('a').attr('href')  ? $(dtElement).find('a').attr('href')  : '';
        
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`언론: ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "언론",
            text: tmpText,
            url: dtUrl,
            issuer:null
          });
        }
      });

      await browser.close();
      return { error: error, data: item };

    } catch (error) {
      Error = error;
      console.log(`error on ${url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }
  },

  crwalingtreatise: async (url) => {
    let browser;
    if (!url) return { error: true, data: null };
  
    try {
      console.log(`crwalingtreatise: ${url}`);
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
  
      await page.goto(url, { waitUntil: 'domcontentloaded' });
  
      // 스크롤해서 lazy-load 유도
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await functions.puppeteerSleep(1000);
  
      // 1) "논문" 탭 찾고 클릭 (페이지 내 모든 <a> 순회로 안전하게 찾기)
      const treatiseTabFound = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const tab = anchors.find(a => (a.textContent || '').trim() === '논문');
        if (tab) {
          tab.click();
          return true;
        }
        return false;
      });
  
      if (!treatiseTabFound) {
        console.log(`No treatise tab found on ${url}. Skipping.`);
        return { error: null, data: { biography: [] } };
      }
  
      // 탭 클릭 후 컨텐츠 로드 대기
      await functions.puppeteerSleep(1000);
  
      // 2) 기다려서 `div.thesis_list`가 생기는지 확인
      try {
        await page.waitForSelector('div.thesis_list', { timeout: 5000 });
      } catch (e) {
        console.log(`Treatise section not found on ${url}. Skipping.`);
        return { error: null, data: { biography: [] } };
      }
  
      // 3) "더보기" 버튼들을 반복 클릭 — Puppeteer 환경에서 동작하도록 page.evaluate 사용
      let clickedAny = false;
      while (true) {
        const clickedCount = await page.evaluate(() => {
          const section = document.querySelector('div.thesis_list');
          if (!section) return 0;
          // 후보 셀렉터들을 모아 검사
          const candidates = Array.from(section.querySelectorAll('span.profile_view_more a, span.more_btn a, a, button'));
          let cnt = 0;
          candidates.forEach(el => {
            const txt = (el.textContent || '').trim();
            // "더보기" 텍스트를 포함하면 클릭
            if (txt.includes('더보기') || txt.includes('더 보기')) {
              try { el.click(); cnt++; } catch (e) { /* ignore */ }
            }
          });
          return cnt;
        });
  
        if (clickedCount > 0) {
          clickedAny = true;
          await functions.puppeteerSleep(1000);; // 클릭 후 로드 대기
        } else {
          break;
        }
      }
  
      // 4) 모든 동적 로딩이 끝났다고 판단하고 HTML을 가져와 cheerio로 파싱
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);
  
      const item = { biography: [] };
  
      // doctorId 추출 시도
      let doctorId = $('input[name="p_doc_id"]').val();
      if (!doctorId) {
        const urlParts = url.split('/');
        doctorId = urlParts.pop() || urlParts.pop();
      }
      if (!doctorId) {
        console.warn('Could not parse doctorId, continuing without it.');
      } else {
        item.doctorId = doctorId;
      }
  
      // 5) 논문 리스트 추출
      $('div.thesis_list').find('div.list_wrap').find('ul > li').each((index, li) => {
        const dtText = $(li).find('div.info_wrap').find('div.title > p').text() || '';
        const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\r/g, '').trim();
        if (tmpText) {
          console.log(`논문: ${tmpText}`);
          item.biography.push({
            type: '논문',
            title: tmpText,
            url: null,
          });
        }
      });
  
      return { error: null, data: item };
    } catch (err) {
      console.error(`error on ${url}:`, err);
      return { error: err, data: [] };
    } finally {
      if (browser) {
        try { await browser.close(); } catch (e) { /* ignore close error */ }
      }
    }
  },
  setCrawlingdoctorBasic: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
    
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL UPDATE_DOCTOR_BASIC(?)`
    // const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, specialty, profileimgurl]);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, specialty, profileimgurl, '']);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },

  setCrawlingdoctorBasic_old: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_crawlingdoctor_basic(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, deptName, doctorName, specialty, profileimgurl]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  setCrawlingdoctorBiography: async (rid, hid, doctorName, jsondata) => {
    
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL SET_DOCTOR_CAREER(?)`
    // const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, doctorName, jsondata]);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, jsondata]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  setCrawlingdoctorBiography_old: async (rid, hid, doctorName, jsondata) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_crawlingdoctor_detail(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, doctorName, jsondata]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url,profile_url,p_hName) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_basic_v3(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url,profile_url,p_hName,url]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },


  setCrawlingDoctorLink_old: async (rid, hid, deptName, doctorName, url) => {
    let result = null, error = null, DBCode = null, DBData = null

    console.log(`setCrawlingDoctorLink: ${rid.length} ${hid} ${deptName} ${doctorName} ${url}`);
    const query = `CALL SET_CRAWLING_DOCTOR_LINK(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, deptName, doctorName, url]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },


  setCrawlingTreatise: async (rid, title, doi, journalName, authorRule, publicationDate, url,
    abstract, keywords, impactFactor, totalCitations, referencesThesis,
    doctorName, authorName, subjectClassification, publicationLocation) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_paper(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, doctorName, title, doi, journalName, authorRule, publicationDate, url,
      abstract, keywords, impactFactor, totalCitations, authorName]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  setCrawlingTreatise_old: async (rid, title, doi, journalName, authorRule, publicationDate, url,
    abstract, keywords, impactFactor, totalCitations, referencesThesis,
    doctorName, authorName, subjectClassification, publicationLocation) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_crawlingdoctor_treatise(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, title, doi, journalName, authorRule, publicationDate, url,
      abstract, keywords, impactFactor, totalCitations, referencesThesis,
      doctorName, authorName, subjectClassification, publicationLocation]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  getCrawlingDoctorLink: async (hid) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_doctor_basic(?)`
    console.log(`getCrawlingDoctorLink: ${hid} ${DATA_VERSION_ID}`);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [hid, DATA_VERSION_ID]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },

  getCrawlingDoctorLink_old: async (hid) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL GET_CRAWLING_DOCTOR_LINK(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [hid]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },


  get_crawling_doctor_mssing_link: async (hid) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_crawling_doctor_mssing_link(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [hid]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },


  get_rid_encrypt: async (p_doctorName, p_refUrl) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_rid(?) `
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_doctorName, p_refUrl]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  get_rid_encrypt_old: async (p_doctorName, p_refUrl) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_rid_encrypt(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_doctorName, p_refUrl]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },


  get_rid_decrypt: async (p_txt) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_rid_decrypt(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_txt]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

}



