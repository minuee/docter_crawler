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

      $('div.medical_list').find('ul > li').each((index, element) => {

        const deptName = $(element).find('a:eq(0)').text() ? $(element).find('a:eq(0)').text()  : '';
        const tmpLink = $(element).find('div.ov').find('a:eq(1)').attr('href') ? $(element).find('div.ov').find('a:eq(1)').attr('href') : '';
        
        console.log(`deptName: ${deptName} ${tmpLink}`);

        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://www.dcmc.co.kr${tmpLink}`;
         
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
      $('div.doctor').find('div.box').each((index, element) => {
        const doctorName = $(element).find('div.doctor_info').find('div.doc_info_area').find('p.name').clone().children('span').remove().end().text() ? $(element).find('div.doctor_info').find('div.doc_info_area').find('p.name').clone().children('span').remove().end().text().trim() : '';
        const detailLink = $(element).find('div.btn').find('a:eq(0)').attr('href') ? $(element).find('div.btn').find('a:eq(0)').attr('href'): '';
        const doctorProfileUrl = $(element).find('div.doctor_info > p.photo > img').attr('src') ?  $(element).find('div.doctor_info > p.photo > img').attr('src') : '';
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://www.dcmc.co.kr${detailLink}`;
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `https://www.dcmc.co.kr${doctorProfileUrl}`;
        }
      
        console.log(`Adding doctor list: ${doctorName} ${deptName} ${tmpProfileUrl} ${tmpLink}`); // 디버
        if ( !functions.isEmpty(doctorName) && !functions.isEmpty(tmpLink) ) {
          const doctor = {
            doctorName,
            deptName,
            url: tmpLink,
            profile_url : tmpProfileUrl
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
      let tmpSpecialty = $('#section0').find('div.part').find('dd').text() ? $('#section0').find('div.part').find('dd').text().trim() : '';
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };
     
      $('#section0').find('div.d_career').find("h3:contains('학력사항')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('strong').text()  ? $(dtElement).find('strong').text().trim()  : '';
        const dtText = $(dtElement).clone().children('strong').remove().end().text() ? $(dtElement).clone().children('strong').remove().end().text().trim()  : '';
        console.log(`학력: ${dtYearText}, ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "학력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#section0').find('div.d_career').find("h3:contains('경력사항')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('strong').text()  ? $(dtElement).find('strong').text().trim()  : '';
        const dtText = $(dtElement).clone().children('strong').remove().end().text() ? $(dtElement).clone().children('strong').remove().end().text().trim()  : '';
        console.log(`경력: ${dtYearText}, ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "경력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#section0').find('div.d_career').find("h3:contains('학회활동')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('strong').text()  ? $(dtElement).find('strong').text().trim()  : '';
        const dtText = $(dtElement).clone().children('strong').remove().end().text() ? $(dtElement).clone().children('strong').remove().end().text().trim()  : '';
        console.log(`학회: ${dtYearText}, ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "학회",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#section0').find('div.d_career').find("h3:contains('해외연수')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('strong').text()  ? $(dtElement).find('strong').text().trim()  : '';
        const dtText = $(dtElement).clone().children('strong').remove().end().text() ? $(dtElement).clone().children('strong').remove().end().text().trim()  : '';
        console.log(`연수: ${dtYearText}, ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "연수",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#section0').find('div.d_career').find("h3:contains('수상이력')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('strong').text()  ? $(dtElement).find('strong').text().trim()  : '';
        const dtText = $(dtElement).clone().children('strong').remove().end().text() ? $(dtElement).clone().children('strong').remove().end().text().trim()  : '';
        console.log(`수상: ${dtYearText}, ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "수상",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

     /*  $('#section1').find('ul.tab').find("li:eq(0)").find('ul.book_list > li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('div.info > div.cont2').find('dl:eq(0) > dd').text() ? $(dtElement).find('div.info > div.cont2').find('dl:eq(0) > dd').text().trim()  : '';
        const dtText = $(dtElement).find('div.info > div.cont').find('p.tit').text() ? $(dtElement).find('div.info > div.cont').find('p.tit').text().trim()  : '';
        const dtTextIssuer = $(dtElement).find('div.info > div.cont').find('p.source').text() ? $(dtElement).find('div.info > div.cont').find('p.source').text().trim()  : '';
        console.log(`논문: ${dtYearText}, ${dtText}, ${dtTextIssuer}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtTextIssuer = dtTextIssuer.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            type: '논문',
            title: tmpText,
            url: null,
            publicationDate : tmpDtYearText,
            journalName : tmpDtTextIssuer
          });
        }
      });
 */

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
      
      let item = {
        biography: [],
      };

      $('#section1').find('ul.tab').find("li:eq(0)").find('ul.book_list > li').each((index, dtElement) => {
      
        const dtYearText = $(dtElement).find('div.info > div.cont2').find('dl:eq(0) > dd').text() ? $(dtElement).find('div.info > div.cont2').find('dl:eq(0) > dd').text().trim()  : '';
        const dtText = $(dtElement).find('div.info > div.cont').find('p.tit').text() ? $(dtElement).find('div.info > div.cont').find('p.tit').text().trim()  : '';
        const dtTextIssuer = $(dtElement).find('div.info > div.cont').find('p.source').text() ? $(dtElement).find('div.info > div.cont').find('p.source').text().trim()  : '';
        console.log(`논문: ${dtYearText}, ${dtText}, ${dtTextIssuer}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtTextIssuer = dtTextIssuer.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            type: '논문',
            title: tmpText,
            url: null,
            publicationDate : tmpDtYearText,
            journalName : tmpDtTextIssuer
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


  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url,profile_url) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_basic_v2(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url,profile_url]);
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
    let result = null, error = null, DBCode = null, DBData = null;
    let rePublicationDate = await functions.formatPublishDate(publicationDate);
    console.log(`setCrawlingTreatise: ${title}, ${rePublicationDate}, ${journalName}`)
    const query = `CALL set_doctor_paper(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, doctorName, title, doi, journalName, authorRule, rePublicationDate, url,
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



