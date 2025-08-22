const config = require(`${global.appRoot}/server/config/configuration`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const https = require('https');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const _ = require('lodash');
const xlsx = require('xlsx');
const path = require('path');
const { isJSON } = require('../../server/util/util.casting');
const mybatisMapper = require("mybatis-mapper");
const functions = require(`${global.appRoot}/server/util/function`);

module.exports = {

  xls2DBType01: async (p_types, p_hospitalName, p_evaluationItem, p_grade, p_location, p_phoneNumber) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_dataGoData1(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_types, p_hospitalName, p_evaluationItem, p_grade, p_location, p_phoneNumber]);
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


  xls2DBType02: async (p_types, p_hospitalName, p_evaluationItem, p_grade, p_location, p_phoneNumber) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_dataGoData2(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_types, p_hospitalName, p_evaluationItem, p_grade, p_location, p_phoneNumber]);
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



  xls2DBType03: async (p_hid, p_yKiho, p_baseName, p_asmGrd, p_asmGrdNm, p_asmNm, p_yadmNm, p_baseYear) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_dataGoData3(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_hid, p_yKiho, p_baseName, p_asmGrd, p_asmGrdNm, p_asmNm, p_yadmNm, p_baseYear]);
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




  openGoApiType01: async (url) => {
    let result = null
    let error = null
    const contentType = 'application/json;charset=UTF-8'
    const referer = url.replace('api', 'page')
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
    try {
      Response = await axios.get(url, {
        params: {
          // 정부 IT 관리자는 서비스 키를 인코딩 디코딩키를 두개를 겸용해서 알아서 쓰라고한다. 이게 KOREAN GOV IT STYLE
          // ServiceKey: 'ABR6mxYh7TOdEEb2GKmcb%2Fd9TFmF3P6xXCghwXoYJSuzoIYj1QBas2ntPCVmbKQ6rU3nLXxMW1wU%2FwoDegVMFg%3D%3D',
          ServiceKey: 'ABR6mxYh7TOdEEb2GKmcb/d9TFmF3P6xXCghwXoYJSuzoIYj1QBas2ntPCVmbKQ6rU3nLXxMW1wU/woDegVMFg==',
          numOfRows: 999,
          pageNo: 1,
          ykiho: 'JDQ4MTg4MSM1MSMkMSMkMCMkOTkkMzgxMzUxIzMxIyQxIyQzIyQ5OSQyNjEwMDIjNDEjJDEjJDgjJDgz'
        },
        headers: {
          'Content-Type': contentType,
          'Referer': 'https://www.google.com',
          'User-Agent': userAgent
        }
      })
    } catch (error) {
      console.log(`error on ${url} API return: ${error}`);
    }
    console.log(`Response >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`)
    const resData = Response.data
    console.log(`resData >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> `);
    console.log(resData);
    return { error: error, data: resData };
  },




  openGoApiType02: async (url, ykiho) => {
    let result = null
    let error = null
    const contentType = 'application/xml'
    const referer = url.replace('api', 'page')
    console.log(`referer========================`)
    console.log(referer)
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
    // let tempUrl = `${url}?serviceKey=ABR6mxYh7TOdEEb2GKmcb%2Fd9TFmF3P6xXCghwXoYJSuzoIYj1QBas2ntPCVmbKQ6rU3nLXxMW1wU%2FwoDegVMFg%3D%3D&ykiho=${ykiho}&numOfRows=999&pageNo=1`
    let tempUrl = `http://apis.data.go.kr/B551182/exclInstHospAsmInfoService/getExclInstHospAsmInfo?serviceKey=ABR6mxYh7TOdEEb2GKmcb%2Fd9TFmF3P6xXCghwXoYJSuzoIYj1QBas2ntPCVmbKQ6rU3nLXxMW1wU%2FwoDegVMFg%3D%3D&pageNo=1&numOfRows=1&ykiho=${ykiho}`
    try {
      Response = await axios.get(tempUrl, {
        // httpsAgent: agent,
        headers: {
          // 'Content-type': 'application/xml',
          'Content-Type': contentType,
          // 'Referer': 'https://www.google.com',
          // 'User-Agent': userAgent
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const resData = Response.data
    return { error: error, data: resData };
  },


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


  process01: async () => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let Response = { status: null, data: null }
    const url = `apis.data.go.kr/B551182/diseaseInfoService`;


    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.goto(url);

    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);
    const jsonData = [];
    const jsonData2 = [];
    let testData = null

    $('select#deptCdSelect option').each((index, element) => {
      const option = $(element);

      if (index !== 0) {

        const txtDept = option.text();
        const txtValue = option.attr('value');
        jsonData.push({ txtDept, txtValue });
        jsonData2.push(`https://www.cmcseoul.or.kr/api/doctor?deptClsf=A&deptCd=${txtValue}&drName=&orderType=`);
      }
    });

    await browser.close();
    return { error: error, data: jsonData2 };
  },



  crwalingProcess02: async (url) => {
    let result = null, Error = null, error = null, DBCode = null
    let Response = { status: null, data: null }
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);
    const txtHtml = $(`pre`).text().trim()
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
      console.log(`error on ${url} API return: ${error}`);
    }
    const resData = Response.data
    const doctorName = resData.drName
    const deptName = resData.doctorDept.deptNm
    const specialty = resData.doctorDept.special
    const drNo = resData.drNo
    const profileimgurl = `https://www.cmcseoul.or.kr/api/attach/view/doctor/${drNo}/profile/1`

    let jsonData = new Array()
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
      jsonData.push(item)

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
      jsonData.push(item)

    }
    const items = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `${profileimgurl}`,
      biography: jsonData,
    };

    return { error: error, data: items };
  },


  get_yGiho_link: async () => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_yGiho_link(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, []);
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



  setCrawlingdoctorBasic: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
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



  setCrawlingdoctorBiography: async (rid, doctorName, jsondata) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_crawlingdoctor_biography(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, doctorName, jsondata]);
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

  saveToDatabase : async(item) => {

    function ensureHttp(url) {
      if (!/^https?:\/\//i.test(url)) {
        return 'http://' + url;
      }
      return url;
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/openAPI_data.go.kr/controler.xml`]);
    
    try {
      
        const param = {
          h_name : item?.yadmNm == undefined ? null : item?.yadmNm,
          h_addr : item?.addr == undefined ? null : item?.addr,
          h_class : item?.clCd == undefined ? null : item?.clCd,
          h_class_name : item?.clCdNm == undefined ? null : item?.clCdNm,
          h_site : ensureHttp(item?.hospUrl) || null,
          h_tel : item?.telno == undefined ? null : item?.telno,
          h_lon : item?.XPos == undefined ? null : item?.XPos,
          h_lat : item?.YPos == undefined ? null : item?.YPos,
          h_sidoCD : item?.sidoCd == undefined ? null : item?.sidoCd,
          h_sidoCdNm : item?.sidoCdNm == undefined ? null : item?.sidoCdNm,
          h_sgguCd : item?.sgguCd == undefined ? null : item?.sgguCd,
          h_sgguCdNm : item?.sgguCdNm == undefined ? null : item?.sgguCdNm,
          h_emdongNm : item?.emdongNm == undefined ? null : item?.emdongNm,
          h_ykiho : item?.ykiho == undefined ? null : item?.ykiho,
          h_estbDd : item?.estbDd == undefined ? null : item?.estbDd,
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "insertHospital",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        const ret = await  functions.myBatisResult(DBError,RS)
        return { success: true, data: ret };
    }catch(e){
        console.error(`error : ${e}`)
        return { success : false,error: e, data: [] };
    }

  }


}



