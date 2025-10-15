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

  crwalingProcess01: async () => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    const url01 = `https://www.amc.seoul.kr/asan/departments/deptListTypeA.do`;
    try {
      Response = await axios.get(url01, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url01} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    $('span').empty();
    const urls = [];
    const sUrl = $('a[href*="staffBaseInfoList.do?searchHpCd="]');
    sUrl.each((index, element) => {
      console.log($(element).attr('href'));
      urls.push($(element).attr('href'));
    });


    return { error: error, data: urls };
  },

  crwalingProcess02: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    $('span').empty();
    const info = [];
    $('div.doctor_info').each((index, element) => {
      const deptName = $(element).find('div.professionally_wrap > table > tbody > tr:nth-child(1) > td > a:nth-child(1)').text().trim();
      const doctorName = $(element).find('p.doctor_name a').text().trim();
      const tempUrl = $(element).find('a.whiteMdBtn').attr('onclick');
      const parts = tempUrl.split("'")
      const fullUrl = `https://www.amc.seoul.kr/asan/staff/base/staffBaseInfoDetail.do?drEmpId=${parts[1]}&searchHpCd=${parts[3]}&pageIndex=1&tabIndex1=3&tabIndex2=`
      const profileUrlTmp = $(element).find('p.doctor_photo a').find('img').attr('src');
      const profileUrl = `https://www.amc.seoul.kr${profileUrlTmp}`;
      const item = {
        deptName: deptName,
        doctorName: doctorName,
        url: fullUrl,
        profileUrl
      }
      info.push(item)
    });
    return { error: error, data: info };
  },


  crwalingProcess03: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const deptName = $('span.dep3Title').first().text().trim();
    const doctorName = $('li.snsBox2 div.photoh5').first().text().trim();
    const profileImgUrl = $('img.img_bg').first().attr('src');
    // const specialty = $('div.detailText').first().text().trim();
    const specialty = $('.photoDetailBox li:nth-of-type(2) .detailText').text().trim();
    console.log(`deptName : ${deptName}, doctorName: ${doctorName}, profileImgUrl: ${profileImgUrl}, specialty: ${specialty}`)
    let item = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `https://www.amc.seoul.kr${profileImgUrl}`,
      biography: [],
    };

    $('dl.textList2.new dt').each((index, dtElement) => {
      const dtText = $(dtElement).text().trim();
      if (dtText === '학력' || dtText === '경력') {
        const ddElement = $(dtElement).next('dd');
        const liElements = ddElement.find('ul.textListCon li');
        liElements.each((liIndex, liElement) => {
          const targetDate = $(liElement).find('span').text().trim().replace(/\t/g, '').replace(/\n/g, '');
          const text = $(liElement).find('p').text().trim();
          console.log(`type : ${dtText}, argetDate: ${targetDate}, text: ${text}`)
          item.biography.push({
            date : targetDate,
            type: dtText,
            text: text
          });
        });
      }
    });

    return { error: error, data: item };
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


  del_crawlingdoctor_treatise: async (p_rid) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL del_crawlingdoctor_treatise(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_rid]);
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


  getTreatiseTotalcount: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const tempUrl = `${url.baseURL}?drEmpId=${url.drEmpId}&searchHpCd=${url.searchHpCd}&tabIndex1=5&tabIndex2=1&pageIndex=1`

    try {
      Response = await axios.get(tempUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${tempUrl} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    // 쓰레기 태그 날림
    // $('span').empty(); // 못날림 (이름과 진료과가 붙어있음)
    const totalCount = $('dl.textList3 dt span.textListgreenT').first().text().trim().replace('건', '');
    console.log(`totalCount`)
    console.log(totalCount)
    result = {
      totalCount: totalCount,
      url: tempUrl
    }
    return { error: error, data: result };
  },

  getTreatiseDetail: async (url, refPage) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const tempUrl = `${url.baseURL}?drEmpId=${url.drEmpId}&searchHpCd=${url.searchHpCd}&tabIndex1=5&tabIndex2=1&pageIndex=${refPage}`
    try {
      Response = await axios.get(tempUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${tempUrl} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    // 쓰레기 태그 날림
    // $('span').empty(); // 못날림 (이름과 진료과가 붙어있음)
    const treatise = []
    $('ul.textListCon li').each((index, liElement) => {
      const paperUrl = $(liElement).find('a.tLi').attr('href');
      // 이번에는 링크가 없는것만 가져옴
      const PaperName = $(liElement).find('a span').contents().filter(function() { return this.type === 'text'}).first().text().trim().replace(/\t/g, '').replace(/\n/g, '');
      // 이번한정으로 paperUrl 이 없는 논문만 가져옴//
      if (PaperName) {
        treatise.push({
          title: PaperName,
          doi: null,
          journalName: null,
          authorRule: null,
          publicationDate: null,
          url: paperUrl ? paperUrl : null,
          authorName: null,
          abstract: null,
          keywords: null,
          impactFactor: 0,
          totalCitations: 0,
          referencesThesis: null,
          subjectClassification: null,
          publicationLocation: null
        })
      }
    });
    return { error: error, data: treatise };

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

  generateAccessToken: async (account, deviceInfo) => {
    let result = null, error = null, DBCode = null, DBData = null
    const targetAccount = _.get(account.cms_account, [0], null)
    const deviceType = _.get(deviceInfo.split(':'), [0], null)
    const deviceVersion = _.get(deviceInfo.split(':'), [1], null)
    const deviceUUID = _.get(deviceInfo.split(':'), [2], null)

    if (!targetAccount) error = RM.NO_RESULT
    const payload = {
      exp: Math.floor(Date.now() / 1000) + (60 * 10),
      cms_aid: targetAccount.cms_aid,
      cms_account_role: targetAccount.cms_account_role,
      device_type: deviceType,
      device_version: deviceVersion,
      device_UUID: deviceUUID
    }
    result = {
      accessToken: jwt.sign(payload, config.thisServer.jwtSecret, config.thisServer.jwtOption)
    }
    return { error: error, data: result };
  },


  setRefreshToken: async (cms_aid, refreshToken, deviceInfo, ip) => {
    let result = null, error = null, DBCode = null, DBData = null, refreshTokenInfo = null
    const deviceType = _.get(deviceInfo.split(':'), [0], null)
    const deviceVersion = _.get(deviceInfo.split(':'), [1], null)
    const deviceUUID = _.get(deviceInfo.split(':'), [2], null)
    const query = `CALL USP_CMS_ACCOUNT_SET_REFRESH_TOKEN(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [cms_aid, refreshToken, deviceType, deviceVersion, deviceUUID, ip]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])
    refreshTokenInfo = _.get(RS[2], [0], null)
    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = {
      cms_account: DBData,
      refreshTokenInfo: refreshTokenInfo,
      additionalInfo: `test`,
    }
    return { error: error, data: result };
  },

  authenticateGate: async (email, password, deviceInfo, ip) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    const deviceType = _.get(deviceInfo.split(':'), [0], null)
    const deviceVersion = _.get(deviceInfo.split(':'), [1], null)
    const deviceUUID = _.get(deviceInfo.split(':'), [2], null)
    const query = `CALL USP_CMS_ACCOUNT_GATE(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [email, password, deviceType, deviceVersion, deviceUUID, ip]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData1 = _.get(RS, [1], [])
    DBData2 = _.get(RS[2], [0], null)
    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    // console.log(error)
    result = {
      cms_account: DBData1,
      refreshTokenInfo: DBData2,
    }
    return { error: error, data: result };
  },


  register: async (email, password, domainCode, serviceCode) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL USP_CMS_ACCOUNT_REGISTER(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [email, password, domainCode, serviceCode]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])
    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = {
      cms_account: DBData
    }
    return { error: error, data: result };
  },


  accountList: async (sdate, edate, keyword, limit, offset) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    const query = `CALL USP_CMS_ACCOUNT_LIST(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [sdate, edate, keyword, limit, offset]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData1 = _.get(RS, [1], [])
    // DBData2 = _.get(RS[2], [0], null)
    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    // console.log(error)
    result = {
      list: DBData1,
    }
    return { error: error, data: result };
  },


  accountDetail: async (cms_aid) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    const query = `CALL USP_CMS_ACCOUNT_DETAIL(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [cms_aid]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData1 = _.get(RS, [1], [])
    // DBData2 = _.get(RS[2], [0], null)
    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    // console.log(error)
    result = {
      list: DBData1,
    }
    return { error: error, data: result };
  },


  accountModify: async (cms_aid, cms_account_role, cms_account_restrict_code, cms_password) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    const query = `CALL USP_CMS_ACCOUNT_MODIFY(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [cms_aid, cms_account_role, cms_account_restrict_code, cms_password]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData1 = _.get(RS, [1], [])
    // DBData2 = _.get(RS[2], [0], null)
    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    // console.log(error)
    result = {
      list: DBData1,
    }
    return { error: error, data: result };
  },

}



