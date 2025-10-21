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
      $('ul.dept-list').find('li').each((index, element) => {

        const deptName = $(element).find('div.text-ko > a').text() ? $(element).find('div.text-ko > a').text() : '';
        const tmpLink = $(element).find('div.text-ko').find('ul.over-icon').find('li.doc > a').attr('href') ? $(element).find('div.text-ko').find('ul.over-icon').find('li.doc >a').attr('href') : '' ; 
        
        if ( !functions.isEmpty(tmpLink) ) {
          const link = `https://www.inha.com${tmpLink}`;
          console.log(`tmpLinkDepthNo:${deptName} ${tmpLink}`);
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

  crwalingProcess02: async (link,deptName) => {
    let result = null, error = null, DBCode = null;
    if (functions.isEmpty(link)) {
      return { error: true, data: [] };
    }
    

    try {
      Response = await axios.get(link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${link} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);

    const doctors = [];
    $('ul.doc-list li').each((index, element) => {
      const doctorName = $(element).find('p.name').text() ? $(element).find('p.name').text() : null;
      const detailLink = $(element).find('a').attr('href') ? $(element).find('a').attr('href') : null;
      const link = `https://www.inha.com${detailLink}`;
      const doctor = {
        doctorName,
        deptName,
        url: link,
      };
      doctors.push(doctor); 
    });
 
    console.log(`doctors:${doctors.length}`);
    return { error: error, data: doctors };
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
      const profileImgUrl = $('div.docter-cont > img').attr('src') ? $('div.docter-cont > img').attr('src') : '';
      console.log(`profileImgUrl: ${profileImgUrl} `);
      let tmpSpecialty = $('#info').find('.prg-wrap:first-child').find('div.prg-right > div >').text() ? $('#info').find('.prg-wrap:first-child').find('div.prg-right > div >').text().trim()  : '';
      console.log(`tmpSpecialty: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);

      // 학력 경력
      
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        profileImgUrl: `https://www.inha.com/${profileImgUrl}`,
        biography: [],
      };
      //const smaple = $('#profile').find("div.profile > p:contains('학력')").siblings('ul > li').lnegth;
      //console.log(`_press: ${smaple}`);

      $('#profile').find("div.profile > p:contains('학력')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('p').text() ? $(dtElement).find('p').text() : '';
        const dtText = $(dtElement).find('p')[0].nextSibling.data ? $(dtElement).find('p')[0].nextSibling.data : '';

        console.log(`학력: ${dtYearText} ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : dtYearText,
            type: "학력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#profile').find("div.profile > p:contains('주요경력')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('p').text() ? $(dtElement).find('p').text().replace(/\s+/g, ' ').trim() : '';
        const dtText = $(dtElement).clone().find('p').remove().end().text().trim() ? $(dtElement).clone().find('p').remove().end().text().trim(): '';
        if ( !functions.isEmpty(dtText) ) {
          const tmpTextYear = dtYearText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`경력: ${tmpTextYear} ${tmpText}`);
          item.biography.push({
            targetDate : tmpTextYear,
            type: "경력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#profile').find("div.profile > p:contains('학회')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = '';
        const dtText = $(dtElement).clone().find('p').remove().end().text().trim() ? $(dtElement).clone().find('p').remove().end().text().trim(): '';
        if ( !functions.isEmpty(dtText) ) {
          const tmpTextYear = dtYearText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`학회: ${tmpTextYear} ${tmpText}`);
          item.biography.push({
            targetDate : tmpTextYear,
            type: "학회",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#profile').find("div.profile > p:contains('수상경력')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('p').text() ? $(dtElement).find('p').text().replace(/\s+/g, ' ').trim() : ''; '';
        const dtText = $(dtElement).clone().find('p').remove().end().text().trim() ? $(dtElement).clone().find('p').remove().end().text().trim(): '';
        if ( !functions.isEmpty(dtText) ) {
          const tmpTextYear = dtYearText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`수상: ${tmpTextYear} ${tmpText}`);
          item.biography.push({
            targetDate : tmpTextYear,
            type: "수상",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#profile').find("div.profile > p:contains('주요 논문 및 저서')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('p').text() ? $(dtElement).find('p').text().replace(/\s+/g, ' ').trim() : ''; '';
        const dtText = $(dtElement).clone().find('p').remove().end().text().trim() ? $(dtElement).clone().find('p').remove().end().text().trim(): '';
        if ( !functions.isEmpty(dtText) ) {
          const tmpTextYear = dtYearText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`주요 논문 및 저서: ${tmpTextYear} ${tmpText}`);
          item.biography.push({
            targetDate : tmpTextYear,
            type: "저서",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#profile').find("div.profile > p:contains('언론보도')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('p').text() ? $(dtElement).find('p').text().replace(/\s+/g, ' ').trim() : ''; '';
        const dtText = $(dtElement).clone().find('p').remove().end().text().trim() ? $(dtElement).clone().find('p').remove().end().text().trim(): '';
        if ( !functions.isEmpty(dtText) ) {
          const tmpTextYear = dtYearText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`언론보도: ${tmpTextYear} ${tmpText}`);
          item.biography.push({
            targetDate : tmpTextYear,
            type: "언론보도",
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
      
      $('#profile').find("div.profile > p:contains('주요 논문 및 저서')").next('ul').find('li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('p').text() ? $(dtElement).find('p').text().replace(/\s+/g, ' ').trim() : ''; '';
        const dtText = $(dtElement).clone().find('p').remove().end().text().trim() ? $(dtElement).clone().find('p').remove().end().text().trim(): '';
        if ( !functions.isEmpty(dtText) ) {
          const tmpTextYear = dtYearText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`주요 논문 및 저서: ${tmpTextYear} ${tmpText}`);
          const etc = {
            type: '논문',
            title: (tmpText) ? tmpText : null,
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



