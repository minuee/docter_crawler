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

      $('div.sectionArea').find("ul.sectionList > li").each((index, element) => {
       
        const deptName = $(element).find('div > p').find('a').text() ? $(element).find('div > p').find('a').text().trim() : '';
        const tmpLink = $(element).find('div').find('dl').find('dd > ul').find("li:eq(1)").find('a').attr('href') ? $(element).find('div').find('dl').find('dd > ul').find("li:eq(1)").find('a').attr('href') : '';
        
        console.log(`deptName: ${deptName} ${tmpLink}`);
        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://www.cnuhh.com/medical/info/dept.cs${tmpLink}`;
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

    console.log(`url: ${url} ${deptName}`);
    try{

      const browser = await puppeteer.launch();
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);

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
      $('div.sectionArea').find('ul.introList > li').each((index, element) => {
        const doctorName = $(element).find('div.doctorInfo > div.doctor > dl > dt').find('span').remove().end().text() ?  $(element).find('div.doctorInfo > div.doctor > dl > dt').find('span').remove().end().text() .trim() : '';
        const detailLink = $(element).find('div.doctorInfo > div.doctor > dl').find('dd.lkList > ul').find("li:eq(0)").find('a').attr('href') ? $(element).find('div.doctorInfo > div.doctor > dl').find('dd.lkList > ul').find("li:eq(0)").find('a').attr('href') : '';
        const doctorProfileUrl = $(element).find('div.doctorInfo > div.doctor > dl').find('dd.img > img').attr('src') ? $(element).find('div.doctorInfo > div.doctor > dl').find('dd.img > img').attr('src') : '';
        
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://www.cnuhh.com${detailLink}`;
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `https://www.cnuhh.com${doctorProfileUrl}`;
        }
        const doctorName2 = doctorName.replace("교수","").trim();
        console.log(`Adding doctor list: ${doctorName2} ${deptName} ${tmpProfileUrl} ${tmpLink}`); // 디버
        if ( !functions.isEmpty(doctorName2) && !functions.isEmpty(tmpLink) ) {
          const doctor = {
            doctorName : doctorName2,
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
      await CS.wait(500);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      let tmpSpecialty = $('div.doctorIntro').find('div.introHeader > div').find('dl').find('dd').find('span').remove().end().text() ? $('div.doctorIntro').find('div.introHeader > div').find('dl').find('dd').find('span').remove().end().text().trim() : '';
      console.log(`specialtyJson: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };
     
      $("#introDetail01").find('div.viewArea').each((index, dtElement) => {

        const titleText = $(dtElement).find('dl > dt').first().text().trim();
        console.log(`titleText ${titleText}`);
        if (titleText.includes('학력')) {
          $(dtElement).find("dl").find('dd').each((j, pEl) => {
            const dtText = $(pEl).find("span.txt").text() ? $(pEl).find("span.txt").text().trim().substring(0,500): '';
            const dtYearText = $(pEl).find("span.date").text() ? $(pEl).find("span.date").text().trim() : '';
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다." ) {
              
              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
              const tmpYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
              console.log(`학력 ${tmpText}`);
              item.biography.push({
                targetDate : tmpYearText,
                type: "학력",
                text: tmpText,
                url: null,
                issuer:null
              });
            }
          });
        }else if ( titleText.includes('경력') && !titleText.includes('수상')) {
          $(dtElement).find("dl").find('dd').each((j, pEl) => {
            const dtText = $(pEl).find("span.txt").text() ? $(pEl).find("span.txt").text().trim().substring(0,500): '';
            const dtYearText = $(pEl).find("span.date").text() ? $(pEl).find("span.date").text().trim() : '';
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다." ) {
              
              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
              const tmpYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
              console.log(`경력 ${tmpText}`);
              item.biography.push({
                targetDate : tmpYearText,
                type: "경력",
                text: tmpText,
                url: null,
                issuer:null
              });
            }
          });
        }else if (titleText.includes('수상')) {
          $(dtElement).find("dl").find('dd').each((j, pEl) => {
            const dtText = $(pEl).find("span.txt").text() ? $(pEl).find("span.txt").text().trim().substring(0,500): '';
            const dtYearText =  '';
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다." ) {
              
              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
              const tmpYearText = dtYearText;
              console.log(`수상 ${tmpText}`);
              item.biography.push({
                targetDate : tmpYearText,
                type: "수상",
                text: tmpText,
                url: null,
                issuer:null
              });
            }
          });
        }
      });
      await CS.wait(300);

      $("#introDetail02").find('div.viewArea').each((index, dtElement) => {

        const titleText = $(dtElement).find('dl > dt').first().text().trim();
        console.log(`titleText ${titleText}`);
        if (titleText.includes('저서')) {
          $(dtElement).find("dl").find('dd').each((j, pEl) => {
            const dtText = $(pEl).find("span.txt").text() ? $(pEl).find("span.txt").text().trim().substring(0,500): '';
            const dtYearText = '';
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
              
              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
              const tmpYearText = dtYearText;
              console.log(`저서 ${tmpText}`);
              item.biography.push({
                targetDate : tmpYearText,
                type: "저서",
                text: tmpText,
                url: null,
                issuer:null
              });
            }
          });
        }
      });
      await CS.wait(300);
      $("#introDetail03").find('div.viewArea').each((index, dtElement) => {

        const titleText = $(dtElement).find('dl > dt').first().text().trim();
        console.log(`titleText ${titleText}`);
        if (titleText.includes('학회')) {
          $(dtElement).find("dl").find('dd').each((j, pEl) => {
            const dtText = $(pEl).find("span.txt").text() ? $(pEl).find("span.txt").text().trim().substring(0,500): '';
            const dtYearText = '';
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
              
              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
              const tmpYearText = dtYearText;
              console.log(`학회 ${tmpText}`);
              item.biography.push({
                targetDate : tmpYearText,
                type: "학회",
                text: tmpText,
                url: null,
                issuer:null
              });
            }
          });
        }
        
      });
      await CS.wait(300);
      $("#introDetail03").find('div.viewArea').each((index, dtElement) => {

        const titleText = $(dtElement).find('dl > dt').first().text().trim();
        console.log(`titleText ${titleText}`);
        if (titleText.includes('언론')) {
          $(dtElement).find("dl").find('dd').each((j, pEl) => {
            const dtText = $(pEl).find("a > span.txt").text() ? $(pEl).find("a >span.txt").text().trim().substring(0,500): '';
            const dtUrlText = $(pEl).find("a").attr('href') ? $(pEl).find("a").attr('href') : '';
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
              
              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
              console.log(`언론 ${tmpText}`);
              item.biography.push({
                targetDate : null,
                type: "언론",
                text: tmpText,
                url: dtUrlText,
                issuer:null
              });
            }
          });
        }
        
      });
      await CS.wait(300);
      
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

      $("#introDetail02").find('div.viewArea').each((index, dtElement) => {

        const titleText = $(dtElement).find('dl > dt').first().text().trim();
        console.log(`titleText ${titleText}`);
        if (titleText.includes('연구업적')) {
          $(dtElement).find("dl").find('dd').each((j, pEl) => {
            const dtText = $(pEl).find("span.txt").text() ? $(pEl).find("span.txt").text().trim().substring(0,500): '';
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
              
              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
      
              console.log(`논문: ${tmpText}`);
              item.biography.push({
                type: '논문',
                title: tmpText,
                url: null,
                publicationDate : null,
                journalName : null
              })  
            }
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



