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

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 2;


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

      $('div.c_depart_list_w').find('ul > li').each((index, element) => {

        const deptName = $(element).find('p.tit  > span').text() ?$(element).find('p.tit > span').text() : '';
        const tmpLink = $(element).find('a').attr('href') ? $(element).find('a').attr('href') : '';
        console.log(`tmpLink: ${tmpLink}`);

        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const tmpDepthNo =  tmpLink.replace("./deptView.do",'/deptProfList.do')
          const link = `https://hosp.ajoumc.or.kr/dept${tmpDepthNo}`;
          console.log(`deptName: ${deptName} ${link}`);
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

      const doctors = [];
      $('div.c_doc_list_w').find('ul > li').each((index, element) => {
        const doctorName = $(element).find('div.info').find('p > span.t').text() ? $(element).find('div.info').find('p > span.t').text() : '';
        const detailLink = $(element).find('div.btn_w').find('a:first-child').attr('href') ? $(element).find('div.btn_w').find('a:first-child').attr('href') : '';
        //console.log(`detailLink: ${detailLink},doctorName: ${doctorName}`);
        let tmpLink = null;
        if ( !functions.isEmpty(detailLink) ) {
          const matches = detailLink.match(/'(\d+)'/g).map(num => num.replace(/'/g, ''));
          tmpLink =  `https://hosp.ajoumc.or.kr/doctor/profViewPop.do?deptNo=${matches[0]}&profNo=${matches[1]}`;
        }
        const profileUrlTmp = $(element).find('div.info').find('div.img').find('img').attr('src') ? $(element).find('div.info').find('div.img').find('img').attr('src') : '';
        const profileUrl = profileUrlTmp ? `https://hosp.ajoumc.or.kr${profileUrlTmp}` : '';
        console.log(`Adding doctor list: ${index} ${doctorName} ${deptName} ${tmpLink}`); // 디버
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
      const profileImgUrl = $('div.doc_details_img').find("div.swiper-wrapper > div.swiper-slide:first-child > span > img").attr('src') ? $('div.doc_details_img').find("div.swiper-wrapper > div.swiper-slide:first-child > span > img").attr('src') : '';
      let tmpSpecialty = $('div.doc_details_box').find('div.tit_w').find('dl').find('dt:contains("전문분야")').next('dd').text() ? $('div.doc_details_box').find('div.tit_w').find('dl').find('dt:contains("전문분야")').next('dd').text().trim() : '';
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        profileImgUrl: `https://hosp.ajoumc.or.kr${profileImgUrl}`,
        biography: [],
      };
      //const smaple = $('#_careerContainer').find('._careerIem:first-child > td').text();
      //console.log(`_press: ${smaple}`);

      $('#careerArea').find('ul > li:nth-child(1)').find('ul.list_basic > li').each((index, dtElement) => {
        
        const dtYearText = '';
        const dtText = $(dtElement).find('span').text() ? $(dtElement).find('span').text().trim() : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '').replaceAll(/\n|\r|\s*/g, '');
          const match = functions.splitPeriodAndText(tmpText);
          const tmpDtYearText = dtYearText ? dtYearText : match ? match.period : null;
          console.log(`학력 : ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "학력",
            text: match ? match.text : tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#careerArea > ul > li:nth-child(2)').find('ul.list_basic > li').each((index, dtElement) => {
        
        const dtYearText =  '';
        const dtText = $(dtElement).find('span').text() ? $(dtElement).find('span').text().trim() : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '').replaceAll(/\n|\r|\s*/g, '');
          const match = functions.splitPeriodAndText(tmpText);
          const tmpDtYearText = dtYearText ? dtYearText : match ? match.period : null;
          console.log(`경력 : ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "경력",
            text: match ? match.text : tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#publishArea').find('ul > li:nth-child(1)').find('ul.list_basic > li').each((index, dtElement) => {
        
        const dtYearText =  '';
        const dtText = $(dtElement).find('span').text() ? $(dtElement).find('span').text().trim() : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '').replaceAll(/\n|\r|\s*/g, '');
          const match = functions.splitPeriodAndText(tmpText);
          const tmpDtYearText = dtYearText ? dtYearText : match ? match.period : null;
          console.log(`저서 : ${tmpDtYearText} ${tmpText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "저서",
            text: match ? match.text : tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#pressArea > ul > li:nth-child(1)').find('ul.list_basic > li').each((index, dtElement) => {
        const dtIssuerText = $(dtElement).find('ul > li:nth-child(1) > span.x').text() ? $(dtElement).find('ul > li:nth-child(1) > span.x').text().trim() : '';
        const dtYearText = $(dtElement).find('ul > li:nth-child(2) > span.x').text() ? $(dtElement).find('ul > li:nth-child(2) > span.x').text().trim() : '';
        const dtText = $(dtElement).find('ul > li:nth-child(3) > span > a').text() ? $(dtElement).find('ul > li:nth-child(3) > span > a').text().trim() : '';
        const dtUrl = $(dtElement).find('ul > li:nth-child(3) > span > a').attr('href') ? $(dtElement).find('ul > li:nth-child(3) > span > a').attr('href').trim() : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '').replaceAll(/\n|\r|\s*/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtIssuerText = dtIssuerText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`언론 : ${tmpDtYearText} ${tmpText} ${tmpDtIssuerText}`)
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "언론",
            text: tmpText,
            url: dtUrl,
            issuer: tmpDtIssuerText
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
    let result = null, error = null;
    console.log(`crwalingtreatise: ${url}`);
  
    if (!url) return { error: true, data: null };
  
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(0);
  
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.setViewport({ width: 1200, height: 800 });
  
      // 📌 논문 탭 링크 추출
      const treatiseLink = await page.evaluate(() => {
        const el = document.querySelector("#paperMobTab > a");
        return el ? el.href : null;
      });
  
      if (!treatiseLink) {
        console.log("paperMobTab 링크를 찾을 수 없습니다.");
        await browser.close();
        return { error: "No paperMobTab found", data: [] };
      }
  
      // 📌 논문 페이지 이동
      let finalTreatiseUrl = treatiseLink.includes("&type=16")
        ? treatiseLink
        : `${treatiseLink}&type=16`;
  
      console.log(`finalTreatiseUrl: ${finalTreatiseUrl}`);
      await page.goto(finalTreatiseUrl, { waitUntil: "networkidle2" });
  
      // 📌 list_tbl 로드될 때까지 기다림
      await page.waitForSelector(".list_tbl tbody tr", { timeout: 20000 });
  
      // 📌 혹시 스크롤 필요하면
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 1000));
  
      // 📌 HTML 파싱
      const html = await page.content();
      const $ = cheerio.load(html);
  
      const item = { biography: [] };
  
      $(".list_tbl tbody tr").each((_, el) => {
        const title = $(el).find("td:nth-child(3) a").text().trim();
        if (title) {
          console.log(`논문: ${title}`);
          item.biography.push({
            type: "논문",
            title,
            url: null,
          });
        }
      });
  
      console.log(`총 ${item.biography.length}개의 논문 발견`);
  
      await browser.close();
      return { error: null, data: item };
    } catch (err) {
      console.error(`error on ${url} : ${err}`);
      await browser.close();
      return { error: err.message, data: [] };
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

    let result = null, error = null, DBCode = null, DBData = null;
    console.log(`getCrawlingDoctorLink: ${hid} ${DATA_VERSION_ID}`);
    const query = `CALL get_doctor_basic(?)`
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



