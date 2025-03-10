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

module.exports = {




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

  crwalingProcess01: async () => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let Response = { status: null, data: null }
    const url = `https://www.snuh.org/reservation/meddept/main.do`;
    try {
      Response = await axios.post(
        url, {
        sortType: 'N',
        chkSortType: 'N'
      }, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Referer': 'https://www.snuh.org/reservation/meddept/main.do'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const jsonData = [];
    let hrefValue = null;
    $('.treatLink a').each((index, element) => {
      const anchorText = $(element).text().trim();
      if (anchorText === '의료진') {
        hrefValue = $(element).attr('href').split('\'');
        jsonData.push((_.get(hrefValue, [1], null)));
      }
    });
    console.log(`hrefValue: ${hrefValue}`)
    return { error: error, data: jsonData };
  },


  crwalingProcess02: async (deptCode) => {
    let result = null, error = null, DBCode = null
    let Response = { status: null, data: null }
    const url = `https://www.snuh.org/reservation/meddept/${deptCode}/mainDoctor.do`
    try {
      Response = await axios.post(
        url, {
        pageIndex: 1,
        chkSortType: 'D'
      }, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Referer': 'https://www.snuh.org/reservation/meddept/main.do'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API2 return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const jsonData = [];
    // const link = _.replace(tempLink, '../', 'https://main.kbsmc.co.kr/main/');
    let lastPage = $('a.lastBtn').attr('href');
    lastPage = _.replace(lastPage, 'javascript:paginate(', '');
    lastPage = _.replace(lastPage, ')', '');

    return { error: error, data: lastPage };
  },



  crwalingProcess03: async (deptCode, pageIndex) => {
    let result = null, error = null, DBCode = null
    let Response = { status: null, data: null }
    const url = `https://www.snuh.org/reservation/meddept/${deptCode}/mainDoctor.do?pageIndex=${pageIndex}&sortType=&chkSortType=D&searchWord=`
    console.log(`param pageIndex: >>>>>>> ${pageIndex}`)
    try {
      Response = await axios.post(url, {}, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Content-Type': 'application/x-www-form-urlencoded',
          // 'Content-Type': 'multipart/form-data',
          'Host': 'www.snuh.org',
          'Origin': 'https://www.snuh.org',
          'Referer': `https://www.snuh.org/reservation/meddept/${deptCode}/mainDoctor.do`,
          'Sec-Ch-Ua-Platform': '"Windows"'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API3 return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const jsonData = [];

    $('ul.doctorSchedule li').each((index, element) => {
      const doctorName = $(element).find('div.descWrap a').first().text().trim()
      const deptName = $('div.descWrap span.colorPoint').first().text().trim().replace(/_/g, '').replace(/\[/g, '').replace(/\]/g, '');
      const ProfileUrl = $(element).find('div.imgWrap a.btnType01').attr('href')
      const fixedProfileUrl = _.replace(ProfileUrl, 'philosophy', 'career');
      console.log(`crwalingProcess03 : pageIndex(${pageIndex}) >>>>>>>>>>> ${deptName} ${doctorName}`)
      jsonData.push({
        doctorName: doctorName,
        deptName: deptName,
        url: `https://www.snuh.org/${fixedProfileUrl}`
      }
      )
    })
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

    try {
      Response = await axios.get(url, {
        // httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);

    const doctorName = $('div.doctorInfo div.name strong').first().text().trim();
    const deptName = $('div.blogLinkWrap a.showPub1').first().text().trim();
    const profileImgUrl = $('div.feSlItem img').attr('src');
    const specialty = $('div#pub1 p').contents().last().text().trim().replace(/\t/g, '').replace(/\n/g, '');

    const jsonData = [];
    // 학력 경력 날짜
    $('div.tableType01').each((index, element) => {
      let type = null
      type = $(element).find('thead th').eq(1).text().trim().replace(/\t/g, '').replace(/\n/g, '');
      $(element).find('tbody tr').each((index2, element2) => {
        const tds = $(element2).find('td');
        const year = $(tds[0]).text().trim();
        const text = $(tds[1]).text().trim().replace(/\t/g, '').replace(/\n/g, '');
        jsonData.push({
          type: type,
          targetDate: year,
          text: text
        });
      });
    });

    let item = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `https://www.snuh.org${profileImgUrl}`,
      biography: jsonData,
    };

    console.log(`item`);
    console.log(item);
    return { error: error, data: item };
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



  setCrawlingdoctorBiography: async (rid, hid, doctorName, jsondata) => {
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




  generateAccessToken: async (account, deviceInfo) => {
    // console.log(`account: ${JSON.stringify(account)}`)
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

}



