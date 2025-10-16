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
const { isJSON } = require(`${global.appRoot}/server/util/util.casting`);
const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;

module.exports = {



  /* 
  * *********************************************************************************************
  * timeStamp
  * *********************************************************************************************
  * 
  * *********************************************************************************************/
  setTimeStamp: async () => {
    let result = null, error = null, DBCode = null
    const now = new Date();
    const gapSec = 5 * 1000;
    // 현재 시간에서 5초 차감
    const makeTs = new Date(now.getTime() - gapSec);
    // 5초 전의 13자리 타임스탬프
    const ts13Digit = makeTs.getTime();
    return { error: error, data: ts13Digit };
  },


  /* 
  * *********************************************************************************************
  * cmcseoul.or.kr (서울성모병원) crwaling step1 - refence links load
  * *********************************************************************************************
  * https://www.cmcseoul.or.kr/page/department/A
  * *********************************************************************************************/
  crwalingProcess01: async () => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let Response = { status: null, data: null }
    const url = `https://www.cmcseoul.or.kr/common.examination.doc_list.sp`;
    // try {
    //   Response = await axios.get(url, {
    //     // httpsAgent: agent,
    //     headers: {
    //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
    //         'Referer': 'https://www.cmcseoul.or.kr/page/main'
    //     }
    //  })
    // } catch (error) {
    //   // Error = error
    //   console.log(`error on ${url} API return: ${error}`);
    // }

    // Launch a headless browser
    const browser = await puppeteer.launch();
    // Open a new page
    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url);
    // Get the page content
    const htmlContent = await page.content();
    // Load the HTML content into Cheerio
    // const pageTitle = $('title').text();
    // console.log('Page title:', pageTitle);
    const $ = cheerio.load(htmlContent);
    const jsonData = [];
    const jsonData2 = [];
    let testData = null
    // Find all option tags within the select element and loop through them
    $('select#deptCdSelect option').each((index, element) => {
      const option = $(element);
      // Skip the first option (which is disabled)
      if (index !== 0) {
        // Extract department name and value and push them to the options array
        const txtDept = option.text();
        const txtValue = option.attr('value');
        jsonData.push({ txtDept, txtValue });
        console.log(`https://www.cmcseoul.or.kr/api/doctor?deptClsf=A&deptCd=${txtValue}&drName=&orderType=`);
        jsonData2.push(`https://www.cmcseoul.or.kr/api/doctor?deptClsf=A&deptCd=${txtValue}&drName=&orderType=`);
      }
    });
    // Close the browser
    await browser.close();
    return { error: error, data: jsonData2 };
  },


  /* 
    * *********************************************************************************************
    * www.cmcseoul.or.kr (서울성모병원) crwaling step3 의사 개인 링크 가져오기
    * *********************************************************************************************
    * 
    * *********************************************************************************************/
  crwalingProcess02: async (url) => {
    let result = null, Error = null, error = null, DBCode = null
    let Response = { status: null, data: null }
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const htmlContent = await page.content();

    console.log(`crwalingProcess02 : ${url}`)

    // Load the HTML content into Cheerio
    // const pageTitle = $('title').text();
    // console.log('Page title:', pageTitle);
    const $ = cheerio.load(htmlContent);
    const txtHtml = $(`pre`).text().trim();
    if (isJSON(txtHtml)) {
      jsonData = txtHtml
    } else {
      try {
        jsonData = JSON.parse(txtHtml);
      } catch (error) {
        jsonData = null
      }
    }
    // Close the browser
    await browser.close();
    return { error: error, data: jsonData };
  },



  /* 
  * *********************************************************************************************
  * www.snuh.org (서울대병원) crwaling step4 - 의사 상세 정보 파싱
  * *********************************************************************************************
  * in  : {dbURL}
  * out : {error, data[]}
  * *********************************************************************************************/
  crwalingProcess04: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
 
    const contentType = 'application/json;charset=UTF-8'
    const referer = url.replace('api', 'page')
    console.log(`referer========================`)
    console.log(referer)
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
    try {
      Response = await axios.get(url, {
        // httpsAgent: agent,
        headers: {
          'Content-Type': contentType,
          'Referer': referer,
          'User-Agent': userAgent
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    // const $ = cheerio.load(Response.data);
    const resData = Response.data
    // 쓰레기 태그 날림
 
    const doctorName = resData.drName
    const deptName = resData.doctorDept.deptNm
    const specialty = resData.doctorDept.special
    const drNo = resData.drNo
    const profileimgurl = `https://www.cmcseoul.or.kr/api/attach/view/doctor/${drNo}/profile/1`
    console.log(` doctorName : ${doctorName}, deptName : ${deptName}, specialty : ${specialty}, drNo : ${drNo}, profileimgurl : ${profileimgurl}`)
    let jsonData = new Array();
    let jsonPaper = new Array()
    // console.log(resData)
    for (let index = 0; index < _.size(resData.doctorDetail.doctorRecordList); index++) {
      const element = resData.doctorDetail.doctorRecordList[index];
      const item = {
        type: element.recordTypeText,
        langType: element.langType,
        targetDate: `${element.staYear} ${element.endYear}`,
        text: element.recordContent,
        recordType: element.recordType,
        staYear: element.staYear,
        endYear: element.endYear,
        approvalYn: element.approvalYn,
      }
      console.log(` 1, ${index} : ${JSON.stringify(item)} `)
      jsonData.push(item)
    }

    for (let index = 0; index < _.size(resData.doctorDetail.doctorThesisList); index++) {
      const element = resData.doctorDetail.doctorThesisList[index];
      const item = {
        type: '논문',
        langType: element.langType,
        targetDate: `${element.postedYear} ${element.postedMonth}`,
        title: element.title,
        journalName: element.journalName,
        authorRule: element.authorRule,
        postedYear: element.postedYear,
        postedMonth: element.postedMonth,
        approvalYn: element.approvalYn,
      }
      console.log(` 2, ${index} : ${JSON.stringify(item)} `)
      jsonPaper.push(item)

    }

    for (let index = 0; index < _.size(resData.doctorDetail.doctorBookList); index++) {
      const element = resData.doctorDetail.doctorBookList[index];
      const item = {
        type: '저서',
        langType: element.langType,
        targetDate: `${element.publishYear} ${element.publishMonth}`,
        title: element.title,
        publishName: element.publishName,
        authorRule: element.authorRule,
        publishYear: element.publishYear,
        publishMonth: element.publishMonth,
        approvalYn: element.approvalYn,
      }
      console.log(` 3, ${index} : ${JSON.stringify(item)} `)
      jsonData.push(item)

    }

    for (let index = 0; index < _.size(resData.doctorDetail.doctorNewsList); index++) {
      const element = resData.doctorDetail.doctorNewsList[index];
      const item = {
        type: '언론',
        targetDate: `${element.createdDt}`,
        title: element.title,
        link: element.link,
        newsClsfText: element.newsClsfText
      }
      console.log(` 4, ${index} : ${JSON.stringify(item)} `)
      jsonData.push(item)

    }
    const items = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `${profileimgurl}`,
      biography: jsonData,
      paper : jsonPaper
    };

    // console.log(`resData`);
    // console.log(resData);
    return { error: error, data: items };
  },







  /* 
  * *********************************************************************************************
  * www.snuh.org (서울대병원) crwaling step4 - 의사 상세 정보 파싱
  * *********************************************************************************************
  * in  : {dbURL}
  * out : {error, data[]}
  * *********************************************************************************************/
  crwalingtreatise: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    // const agent = new https.Agent({
    //   rejectUnauthorized: false
    // });
    //https://www.snuh.org/blog/65868/career.do?hsp_cd=

    // https://www.cmcseoul.or.kr/api/doctor/37/D0002470


    const contentType = 'application/json;charset=UTF-8'
    const referer = url.replace('api', 'page')
    console.log(`referer========================`)
    console.log(referer)
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
    try {
      Response = await axios.get(url, {
        // httpsAgent: agent,
        headers: {
          'Content-Type': contentType,
          'Referer': referer,
          'User-Agent': userAgent
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    // const $ = cheerio.load(Response.data);
    const resData = Response.data
    // 쓰레기 태그 날림
    // $('span').empty(); // 못날림 (이름과 진료과가 붙어있음)

    const doctorName = resData.drName
    const deptName = resData.doctorDept.deptNm
    const specialty = resData.doctorDept.special
    const drNo = resData.drNo
    const profileimgurl = `https://www.cmcseoul.or.kr/api/attach/view/doctor/${drNo}/profile/1`

    let jsonData = new Array()
    // console.log(resData)
    for (let index = 0; index < _.size(resData.doctorDetail.doctorThesisList); index++) {
      const element = resData.doctorDetail.doctorThesisList[index];
      const item = {
        rid: null,
        doi: null,
        doctorName: doctorName,
        langType: element.langType ? element.langType : null,
        publicationDate: `${element.postedYear ? element.postedYear : '1900'}-${element.postedMonth ? element.postedMonth : '01'}-01`,
        title: element.title,
        url: null,
        abstract: null,
        keywords: null,
        impactFactor: null,
        totalCitations: null,
        referencesThesis: null,
        journalName: element.journalName,
        authorName: null,
        subjectClassification: null,
        publicationLocation: null,
        authorRule: element.authorRule,
        approvalYn: element.approvalYn
      }
      jsonData.push(item)
    }

    // console.log(`resData`);
    // console.log(resData);
    return { error: error, data: jsonData };
  },


  /* 
    * *********************************************************************************************
    * setCrawlingTreatise
    * *********************************************************************************************
    * 의사 논문데이터 저장
    * *********************************************************************************************/

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



  /* 
    * *********************************************************************************************
    * set_crawlingdoctor_basic
    * *********************************************************************************************
    * 의사 기본프로필 저장
    * *********************************************************************************************/

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


  /* 
    * *********************************************************************************************
    * set_crawlingdoctor_biography
    * *********************************************************************************************
    * 의사 바이오그라피 저장
    * *********************************************************************************************/

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



  /* 
  * *********************************************************************************************
  * setCrawlingLink
  * *********************************************************************************************
  * 크롤링 타겟리스트 데이터 베이스 저장
  * *********************************************************************************************/

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



  /* 
  * *********************************************************************************************
  * get_crawling_doctor_link
  * *********************************************************************************************
  * 크롤링 타겟리스트 데이터 베이스 로드
  * *********************************************************************************************/

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


  /* 
  * *********************************************************************************************
  * get_crawling_doctor_mssing_link
  * *********************************************************************************************
  * 크롤링 타겟리스트 데이터 베이스 로드 (크롤링하지 못한 리스트)
  * *********************************************************************************************/

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

  /* 
  * *********************************************************************************************
  * get_rid_encrypt
  * *********************************************************************************************
  * 
  * *********************************************************************************************/

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

  /* 
  * *********************************************************************************************
  * get_rid_decrypt
  * *********************************************************************************************
  * 
  * *********************************************************************************************/

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



