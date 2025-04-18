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

      $('#contents_area').find("div.medical_wrap").each((tindex, tElement) => {

        $(tElement).find('ul').each((index, element) => {

          const deptName = $(element).find('li:eq(0)').text()  ? $(element).find('li:eq(0)').text().trim()  : '';
          const tmpLink = $(element).find("li:eq(1)").find("a:eq(1)").attr('href') ? $(element).find("li:eq(1)").find("a:eq(1)").attr('href') : '';
          
          console.log(`deptName: ${deptName} ${tmpLink}`);

          if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
            const link = `https://www.dkuh.co.kr/html_2016/03/${tmpLink}`;
            dept.push({ 
              deptName,
              link
            });
          }
        });
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
      $('#drTable').find('div.row2').each((index, element) => {
        const doctorName = $(element).find('table.drTable').find('tbody > tr:eq(0)').find('td:eq(1)').find('span.doctor_name').text() ? $(element).find('table.drTable').find('tbody > tr:eq(0)').find('td:eq(1)').find('span.doctor_name').text().trim() : '';
        const detailLink = $(element).find('span.viewBtn').attr('onclick') ? $(element).find('span.viewBtn').attr('onclick') : '';
        const doctorProfileUrl = $(element).find('table.drTable').find('tbody > tr:eq(0)').find('td:eq(0)').find('img').attr("src") ?$(element).find('table.drTable').find('tbody > tr:eq(0)').find('td:eq(0)').find('img').attr("src"): '';
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          const match = detailLink.match(/view_dr\((\d+)\)/);
          console.log(`match: ${match}`)
          if (match) {
            const docNo = match[1];
            tmpLink =  `https://www.dkuh.co.kr/html_2016/03/01_02.php?idx=${docNo}&url=%2Fhtml_2016%2F03%2Ffm_02.php&drword=`;
          } 
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  doctorProfileUrl;
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
      let tmpSpecialty = $('li.icon01').find('div.dctTabCont').find('ul').find("h5:contains('전문진료분야')").next('ul').find('li').text() ? $('li.icon01').find('div.dctTabCont').find('ul.introList').find("h5:contains('전문진료분야')").next('ul').find('li').text().trim() : '';
      console.log(`specialtyJson: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };

      const targetData1 = $('li.icon01').find('div.dctTabCont').find('ul').find("h5:contains('학력')").next('ul').find('div').html();
      const targetData1_cleanHtml = targetData1 ? targetData1.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData1_cleanHtml ) {
        const lines1 = targetData1_cleanHtml.includes("<br>") ? targetData1_cleanHtml.split("<br>") : targetData1_cleanHtml.split("\n");
        lines1.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`학력 ${tmpText}`);
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

      const targetData2 = $('li.icon01').find('div.dctTabCont').find('ul').find("h5:contains('언론보도')").next('ul').find('div').html();
      const targetData2_cleanHtml = targetData2 ? targetData2.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData2_cleanHtml ) {
        // 2. <br> 기준으로 줄 나누기
        const lines2 = targetData2_cleanHtml.includes('<br>')
        ? targetData2_cleanHtml.split(/<br\s*\/?>/i)
        : targetData2_cleanHtml.split('\n');

        // 3. 줄별 텍스트만 추출
        const textLines = lines2
        .map(line => $('<div>').html(line).text().trim()) // HTML -> 텍스트만
        .filter(line => line.length > 0); // 빈 줄 제거

        textLines.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`언론 ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "언론",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        });
      }

      const targetData3 = $('li.icon02').find('div.dctTabCont').find('ul').find("h5:contains('경력')").next('ul').find('div').html();
      const targetData3_cleanHtml = targetData3 ? targetData3.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData3_cleanHtml ) {
        const lines3 = targetData3_cleanHtml.includes("<br>") ? targetData3_cleanHtml.split("<br>") : targetData3_cleanHtml.split("\n");
        lines3.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`경력 ${tmpText}`);
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

      const targetData4 = $('li.icon03').find('div.dctTabCont').find('ul').find("h5:contains('눈문')").next('ul').find('div').html();
      const targetData4_cleanHtml = targetData4 ? targetData4.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData4_cleanHtml ) {
        const lines4 = targetData4_cleanHtml.includes("<br>") ? targetData4_cleanHtml.split("<br>") : targetData4_cleanHtml.split("\n");
        lines4.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`저서 ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "저서",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        });
      }

      const targetData4_2 = $('li.icon03').find('div.dctTabCont').find('ul').find("h5:contains('논문')").next('ul').find('div > p > font').html();
      const targetData4_2_cleanHtml = targetData4_2 ? targetData4_2.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData4_2_cleanHtml ) {
        const lines4 = targetData4_2_cleanHtml.includes("<br>") ? targetData4_2_cleanHtml.split("<br>") : targetData4_2_cleanHtml.split("\n");
        lines4.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`저서 ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "저서",
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

      const targetData4 = $('li.icon03').find('div.dctTabCont').find('ul').find("h5:contains('눈문')").next('ul').find('div').html();
      const targetData4_cleanHtml = targetData4 ? targetData4.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData4_cleanHtml ) {
        const lines4 = targetData4_cleanHtml.includes("<br>") ? targetData4_cleanHtml.split("<br>") : targetData4_cleanHtml.split("\n");
        lines4.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`논문 ${tmpText}`);
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

      const targetData4_2 = $('li.icon03').find('div.dctTabCont').find('ul').find("h5:contains('논문')").next('ul').find('div > p > font').html();
      const targetData4_2_cleanHtml = targetData4_2 ? targetData4_2.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData4_2_cleanHtml ) {
        const lines4 = targetData4_2_cleanHtml.includes("<br>") ? targetData4_2_cleanHtml.split("<br>") : targetData4_2_cleanHtml.split("\n");
        lines4.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`논문 ${tmpText}`);
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



