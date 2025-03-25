const config = require(`${global.appRoot}/server/config/configuration`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;

module.exports = {

  crwalingProcess01: async (r_url) => {
    
    try {
      //Response = await axios.get(r_url);
      console.log(`r_url: ${r_url}`);
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
      ///console.log(`r_url: ${r_url} ${$('div.medi_index_wrap').attr('class')}`);
      $('div.bh_mgb40').find("h5.tit_h5:contains('진료과')").next('div').find('ul > li').each((index, element) => {

        const deptName = $(element).find('dl > dt > p > a').text() ? $(element).find('dl > dt > p > a').text() : '';
        const tmpLink = $(element).find('ul').find('li.bh_dl_2 > a').attr('href') ? $(element).find('ul').find('li.bh_dl_2 > a').attr('href') : '' ; 
        
        if ( !functions.isEmpty(tmpLink) ) {
          const link = `https://www.snubh.org${tmpLink}`;
          console.log(`tmpLinkDepthNo:${deptName} ${link}`);
          dept.push({ 
            deptName,
            link,
          });
        }
      });

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
      $('ul.bh_bookmark_list_ul_n li').each((index, element) => {
        const doctorName = $(element).find('div.bh_doctor_introduce3').find('div.bh_doctor_name_n > strong').text() ? $(element).find('div.bh_doctor_introduce3').find('div.bh_doctor_name_n > strong').text() : '';
        const detailLink = $(element).find('div.bh_doctor_introduce3').find('div.bh_doctor_btn_wrap_n > input').attr('onclick') ? $(element).find('div.bh_doctor_introduce3').find('div.bh_doctor_btn_wrap_n > input').attr('onclick') : '';
        const match = detailLink.match(/\{.*\}/);
        const params = JSON.parse(match[0].replace(/'/g, '"'));
        //console.log(`params:${JSON.stringify(params)}`);
        const tmpDoctorName = doctorName.split(' ')[0];
        const link = `https://www.snubh.org/medical/drIntroduce.do?DP_TP=O&DP_CD=${params?.sDpCdDtl}&sDpCdDtl=FM&sDrSid=${params?.sDrSid}&sDrStfNo=${params?.sDrStfNo}&sDpTp=O`;
        console.log(`doctorName:${tmpDoctorName} detailLink:${link}`);

        const doctor = {
          doctorName : tmpDoctorName,
          deptName,
          url: link,
        };
        doctors.push(doctor); 
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
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`linkUrl: ${url} `);
   
    try {
      const browser = await puppeteer.launch({
        //headless:false,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
      ]
      });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      await page.on("dialog", async (dialog) => { await dialog.accept(); });
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
      const profileImgUrl = $('div.slick-track').find('.slick-slide:first-child').find('img:first-child').attr('src') ? $('div.slick-track').find('.slick-slide:first-child').find('img:first-child').attr('src') : '';
      console.log(`profileImgUrl: ${profileImgUrl} `);
      let tmpSpecialty = $('div.doc_profile_wrap').find("div.doc_info_wrap").find('dl.part_box').find('dd.part_dec').text() ? $('div.doc_profile_wrap').find("div.doc_info_wrap").find('dl.part_box').find('dd.part_dec').text()  : '';
      console.log(`tmpSpecialty: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.trim().split(",");
      //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);

      // 학력 경력
      
      let item = {
        specialty: functions.isEmpty(tmpSpecialty) ? "" : tmpSpecialty.trim(),
        specialtyJson: functions.isEmpty(tmpSpecialty) ? "" : specialtyJson,
        profileImgUrl: functions.isEmpty(profileImgUrl) ? "" : `https://www.snubh.org/${profileImgUrl}`,
        biography: [],
      };
      //const smaple = $('#profile').find("div.profile > p:contains('학력')").siblings('ul > li').lnegth;
      //console.log(`_press: ${smaple}`);

      $('#cont_wrap3').find("div.bh_mgb25:nth-child(2)").find('ul > li').each((index, dtElement) => {
        
        const dtYearText = '';
        const dtText = $(dtElement).text() ?$(dtElement).text().trim() : '';

       
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.trim().replaceAll(/\t/g, '').replaceAll(/\n/g, '').replaceAll(/\n|\r|\s*/g, '');
          console.log(`학력: ${dtYearText} ${tmpText}`);
          item.biography.push({
            targetDate : dtYearText,
            type: "학력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#cont_wrap3').find("div.bh_mgb25:nth-child(3)").find('ul > li').each((index, dtElement) => {
        
        const dtYearText = '';
        const dtText = $(dtElement).text() ?$(dtElement).text().trim() : '';
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.trim().replaceAll(/\t/g, '').replaceAll(/\n/g, '').replaceAll(/\n|\r|\s*/g, '');
          console.log(`경력: ${dtYearText} ${tmpText}`);
          item.biography.push({
            targetDate : dtYearText,
            type: "경력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#cont_wrap3').find("div.bh_mgb25:nth-child(4)").find('ul > li').each((index, dtElement) => {
        
        const dtYearText = '';
        const dtText = $(dtElement).text() ?$(dtElement).text().trim() : '';
        
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.trim().replaceAll(/\t/g, '').replaceAll(/\n/g, '').replaceAll(/\n|\r|\s*/g, '');
          console.log(`수상 : ${dtYearText} ${tmpText}`);
          item.biography.push({
            targetDate : dtYearText,
            type: "수상",
            text: tmpText,
            url: null,
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

    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`linkUrl: ${url} `);
   
    try {
      const browser = await puppeteer.launch({
        //headless:false,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
      ]
      });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      await page.on("dialog", async (dialog) => { await dialog.accept(); });
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
      $('#cont_wrap4').find("div.bh_mgb25:nth-child(1)").find('ul > li').each((index, dtElement) => {
        const dtYearText = '';
        const dtText = $(dtElement).find('p.title').text() ? $(dtElement).find('p.title').text().trim() : '';  
        console.log(`논문: ${dtYearText} ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.trim().replaceAll(/\t/g, '').replaceAll(/\n/g, '').replaceAll(/\n|\r|\s*/g, '');
          const etc = {
            type: '논문',
            title: tmpText,
            url: null,
          };
          item.biography.push(etc);
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
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, jsondata]);
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



  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_basic(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url]);
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

  getCrawlingDoctorLink: async (hid) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_doctor_basic(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [hid,DATA_VERSION_ID]);
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
    const query = `CALL set_rid(?)`
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



