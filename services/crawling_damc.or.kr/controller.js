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

      $('div.depart_section').find('div.docCate').find('div.depart_box').each((index, element) => {

        const deptName = $(element).find('h4').text() ? $(element).find('h4').text().trim()  : '';
        const tmpLink = $(element).find('ul').find('li:eq(1) > a').attr('href') ? $(element).find('ul').find('li:eq(1) > a').attr('href') : '';
        
        console.log(`deptName: ${deptName} ${tmpLink}`);

        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://www.damc.or.kr/02/${tmpLink}`;
         
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
      await CS.wait(500);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent); 

      const doctors = [];
      const elements = $('div.doc_list').find('div.doc_info').toArray();

      for (const [index, element] of elements.entries()) {
        const doctorName = $(element).find('div.doc_txt').find('dl > dt').find('b').text() ? $(element).find('div.doc_txt').find('dl > dt').find('b').text().trim() : '';
        const detailLink = $(element).find('div.doc_txt').find('div.docDetailBtn').find('span > a').attr('href') ? $(element).find('div.doc_txt').find('div.docDetailBtn').find('span > a').attr('href') : '';
        const doctorProfileUrl = $(element).find('div.simg').find('span > img').attr('src') ?  $(element).find('div.doctor_info > p.photo > img').attr('src') : '';
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          const match = detailLink.match(/layerPOP\('([^']+)'/);

          if (match) {
            const firstParam = match[1];
            console.log(`✅ 첫 번째 인자: ${firstParam}`);
            tmpLink =  `https://www.damc.or.kr/${firstParam}`;
          } else {
            console.log('❌ 추출 실패');
          }
          
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `https://www.damc.or.kr${doctorProfileUrl}`;
        }

        console.log(`Adding doctor list: ${doctorName} ${deptName} ${tmpProfileUrl} ${tmpLink}`); // 디버
          if ( !functions.isEmpty(doctorName) && !functions.isEmpty(tmpLink) ) {
            const doctor = {
              doctorName,
              deptName,
              url: tmpLink,
              profile_url : tmpProfileUrl,
            };
            doctors.push(doctor); 
          }
        /* if ( !functions.isEmpty(tmpLink) ) {
         // 클릭
          const academy = await page.$('div.docDetailBtn > span > a');
          await academy.click();
          await CS.wait(1000);
          //await page.waitForSelector('div.dhtmlwindow', { visible: true });
          // 2. 팝업 iframe 로딩 대기
          await page.waitForSelector('iframe[name="_iframe-ly"]', { visible: true });

          // 3. iframe 객체 가져오기
          const frame = await page.frames().find(f => f.name() === '_iframe-ly');

          // 4. iframe 안에서 #docDetail 로딩 대기
          await frame.waitForSelector('#docDetail', { visible: true });
          // 페이지의 현재 HTML을 가져옴 (팝업이 열린 상태의 HTML) 
          const popHtmlContent = await page.content();

          // cheerio로 파싱
          const $2 = cheerio.load(popHtmlContent);
        
          // 팝업 정보 추출
          const popID = $2('div.dhtmlwindow').attr('id');
          const popSpeciality = $2('div.docDetail').find("div.docRight > table").find("tbody > tr:eq(1)").find('td').text();
          console.log(`✅ 팝업 ID: ${popID} ${popSpeciality}`);

          let specialtyJson = null;
          if ( !functions.isEmpty(popSpeciality) ) {
            specialtyJson = popSpeciality.split(",");
          }
        
          
        } */
      };
   
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
      
      let tmpSpecialty = $('div.docDetail').find("div.docRight > table").find("tbody > tr:eq(1)").find('td').text();
      console.log(`✅ tmpSpecialty: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };
     
      const targetData1 = $('div.docDetail').find("div.docRight > table").find("tbody > tr:eq(2)").find('td').html();
      if ( targetData1 ) {
        const lines = targetData1.includes("<br>") ? targetData1.split("<br>") : targetData1.split("\n");
        lines.forEach((dtElement, index) => {
          
          if ( !functions.isEmpty(dtElement) && dtElement?.length > 7 ) {  
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`학력: ${tmpText?.length}, ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "학력",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        });
      }
      const targetData2 = $('div.docDetail').find("div.docRight > table").find("tbody > tr:eq(3)").find('td').html();
      if ( targetData2 ) {
        const lines = targetData2.includes("<br>") ? targetData2.split("<br>") : targetData2.split("\n");
        lines.forEach((dtElement, index) => {
          
          if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {  
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`경력: ${tmpText?.length}, ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "경력",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        });
      }
      const targetData3 = $('div.docDetail').find("div.docRight > table").find("tbody > tr:eq(3)").find('td').html();
      if ( targetData3 ) {
        const lines = targetData3.includes("<br>") ? targetData3.split("<br>") : targetData3.split("\n");
        lines.forEach((dtElement, index) => {
          
          if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {  
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`학회: ${tmpText?.length}, ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "학회",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        });
      }

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



