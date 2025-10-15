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

let browser = null;


module.exports = {

  crwalingProcess01: async () => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    // const url01 = `https://med.khmc.or.kr/kr/treatment/department/list.do`;
    const url01 = `https://mokdong.eumc.ac.kr/medical/dept/deptList.do`;
    
    console.log(`url01`, url01)
 
    browser = await puppeteer.launch();
    // Open a new page
    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url01);
    await page.waitForSelector('.partList > div');
    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);

    // const appcontent = $('div#app').html();

    const optionsArray = [];
    $('.partList > div').each((index, item) => {
      const title = $(item).find('span').text().trim();
      const link = $(item).find('.hover .btnWrap a:nth-of-type(2)').attr('href');
      console.log(`title`, title)
      console.log(`link`, link)
      if(title) {
        const url = `https://mokdong.eumc.ac.kr/medical/dept/${link}`;
        optionsArray.push({
          title,
          link: url
        });
      }
    });

    page.close();

    return { error: error, data: optionsArray };
  },


  crwalingProcess02: async (url) => {
    let result = null, Error, error = null, DBCode = null
    
    console.log(`url`, url);

    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url);

    await new Promise(r => setTimeout(r, 3000));

    try {
      // await page.waitForSelector('.doctorList .dL_line .profile_box');
      await page.waitForSelector('.panel-list > div', { timeout: 5000 });
    } catch (e) {
      error = `element(.profile_box) probably not exists at url(${url})`;
      console.log(error);
      return { error, data: null };
    }


    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);

    // const body = $('body').html();

    const doctorArray = [];
    const deptName = $('.heading.heading-depth01 > h2.title').text().trim();

    $('.panel-list > div.item').each((index, item) => {
      //tit_sectin inner h2
      let doctorName = $(item).find('.card-body > .title > a').text().trim();
      doctorName = doctorName.split(' ')[0];
      console.log(`doctorName`, doctorName);

      const onclickValue = $(item).find('.btnGroup-horizontal a:nth-of-type(2)').attr('onclick')

      // const pattern = /drProfile\('([0-9A-Za-z]+)', '([A-Z]+)'\)/;
      const pattern = /drProfile\('([0-9A-Za-z]+)', '(.*)'\)/;
      const matches = onclickValue.match(pattern);
      const dr_sid = matches[1];
      const dept_cd = matches[2];
      console.log(`dr_sid`, dr_sid);
      console.log(`dept_cd`, dept_cd);

      const link = `https://mokdong.eumc.ac.kr/doctor/basicInfo.do?dr_sid=${dr_sid}&dept_cd=${dept_cd}`;
      const profileUrlTmp = $(item).find('.card-img > a > img').attr('src');
      const profileUrl = `https://mokdong.eumc.ac.kr${profileUrlTmp}`;
      if(doctorName && link){
        doctorArray.push({
          deptName: deptName,
          doctorName: doctorName,
          link,
          profileUrl
        });
      }
    });

    page.close();
    // browser.close();
    return { error: error, data: doctorArray };
  },


  openBrowser: async (option) => {
    if( !browser ) {
      browser = await puppeteer.launch(option);
    }
  },

  closeBrowser: async () => {
    if( browser ) {
      await browser.close();
      browser = null;
    }
  },  


  crwalingProcess03: async (url) => {
    let result = null, Error, error = null, DBCode = null

    let basic = {};
    let detail = [];
    const treatise = [];

    const page = await browser.newPage();

    try {

      // Navigate to the website
      await page.goto(url);

      await page.waitForSelector('#content');

      const htmlContent = await page.content();

      const $ = cheerio.load(htmlContent);

      const body = $('body').html();

      const info = [];
      const jsonData = [];
      let doctorName = $('div.profile > .info > div.heading.heading-depth02 > h3.title').text().trim().replace(/\t/g, '').replace(/\n/g, '');
      doctorName = doctorName.split(' ')[0];
      console.log(`doctorName`, doctorName);

      const deptName = $('div.profile > .info > div.heading.heading-depth02 > b').text().trim().replace(/\t/g, '').replace(/\n/g, '');

      const specialty = $('div.profile > .info > p').text().trim().replace(/\t/g, '').replace(/\n/g, '');

      $('div.profile > .info > #tab-info01 > div').each((index, element) => {
        // const targetDate = $(element).find('th').text().trim();
        let type = $(element).find('h4.title').text().trim();

        $(element).next().find('li').each((idx, elem) => {
          let content = $(elem).text().trim();
          let targetDate;
          let career; 
          
          content = content.split('|');
          if( content.length > 1) {
            const dateStr = content[0];
            targetDate = dateStr.trim();
            career = content[1];
          }
          else {
            career = content;
          }
          
          if(career) {
            const strType = type == '학력사항' ? '학력' : type === '기타 학술 관련 경력' ? "학회" : '경력';
            console.log(`type : ${type}, targetDate : ${targetDate}, text : ${career}`);
            jsonData.push({ type, date, text: career, url:''});
          }
        });
      })

      const ImageUrl = $('.photo img').attr('src');

      detail = jsonData;
      basic = {
        rid: null,
        hid: null,
        deptName: deptName,
        doctorName: doctorName,
        specialty: specialty,
        profileImgUrl: `https://mokdong.eumc.ac.kr${ImageUrl}`
      }
      console.log(`deptName : ${deptName}, doctorName : ${doctorName}, specialty : ${specialty}, profileImgUrl : ${ImageUrl}`);
      $('div.profile > .info > #tab-info02 > div').each((index, element) => {
        let type = $(element).find('h4.title').text().trim();

        $(element).next().find('li').each((idx, elem) => {
          const content = $(elem).text().trim();
          

          let targetDate;

          const text = $(elem).find('strong').text().trim()
            .replace('\"', '')
            .replace('&nbsp;', '')
            .replace(/\t/g, '')
            .replace(/\n/g, '');

          let journal = $(elem).text().trim()
            .replace('\"', '')
            .replace('&nbsp;', '');

          journal = journal.replace(text, '').trim();
          
          if(text) {
            console.log(`type : ${type}, targetDate : ${targetDate}, text : ${text}, journal : ${journal}`);
            treatise.push({ type, date, journalName: journal, title: text, url:''});
          }
        });
      });

    }
    catch(error) {
      console.log('error', error);
      console.log(`The crawling attempt from URL(${url}) has failed.`);
    }
    finally {
      page.close();
    }

    result = {
      basic: basic,
      detail: detail,
      treatise: treatise
    }
    return { error: error, data: result };
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



  setCrawlingTreatise: async (rid, title, doi, journalName, authorRule, publicationDate, url,
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

    console.log(`p_doctorName : ${p_doctorName}, p_refUrl : ${p_refUrl}`);
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



