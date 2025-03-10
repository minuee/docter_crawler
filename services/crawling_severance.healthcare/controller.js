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
    let DBData2 = null
    let Response = { status: null, data: null }

    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    const url01 = `https://sev.severance.healthcare/api/doctor/list.do?insttCode=2&tyCode=DP010100&seCode=&seq=&keyword=&page=1&pagePerNum=1000&isChoSung=N`;
    try {
      Response = await axios.get(url01, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Referer': 'https://sev.severance.healthcare/sev/doctor/doctor.do'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url01} API return: ${error}`);
    }

    return { error: error, data: Response.data.data.list };
  },

  crwalingProcess02: async (profile) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    const deptName = profile.deptNm
    const doctorName = profile.nm
    const specialty = profile.clnicRealm
    const fullUrl = `https://sev.severance.healthcare/sev/doctor/doctor-view.do?empNo=${profile.empNo}&deptSeq=${profile.deptSeq}`
    const item = {
      deptName: deptName,
      doctorName: doctorName,
      specialty: specialty,
      url: fullUrl
    }


    return { error: error, data: item };
  },



  crwalingProcess03: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    try {
      Response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const doctorName = $('h2.profile-name strong.name.nm').first().text().trim();
    const deptName = $('h2.profile-name span.department').first().text().trim();
    const profileImgUrl = $('div.profile-item img').attr('src');
    const specialty = $('p.medical-subject').text().trim();

    const jsonData = [];

    $('div.profile-intro dl').each((index, element) => {
      let type = null
      type = $(element).find('dt.text-title').text().trim(); // 타입(학력 경력)
      $(element).find('dd ul li').each((index2, element2) => {
        const text = $(element2).text().trim(); // 내용
        jsonData.push({
          type: type,

          text: text
        });
      });
    });

    let item = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `https://sev.severance.healthcare${profileImgUrl}`,
      biography: jsonData,
    };

    console.log(`item`);
    console.log(item);
    return { error: error, data: item };
  },

  crwalingGetTreatiseLink: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    try {
      Response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }

    let $ = null

    try {
      $ = cheerio.load(Response.data);
      const tempLink = $('ul.tab-list li a:contains("논문")').attr('href');
      const treatiseLink = tempLink ? tempLink : null
      console.log(`treatiseLink: ${treatiseLink}`);
      return { error: error, data: treatiseLink };
    } catch (error) {
      return { error: error, data: null };
    }
  },


  getTreatiseApiLink: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    let tempUrl = url
    let params = null
    let seqValue = null
    let modeValue = null
    let categoryValue = null

    try {
      params = new URLSearchParams(url.split('?')[1]);
      seqValue = params.get('seq');
      modeValue = params.get('mode');
      categoryValue = params.get('search_field');
    } catch (error) {
      console.log(`error on ${url} params return: ${error}`);
    }
    //https://yhrn.yonsei.ac.kr/Search/Result.aspx?search_field=Expert&search_word=&targetFd=Expert&mode=view&seq=38527
    try {
      if (!seqValue || !modeValue || !categoryValue) {
        return { error: error, data: null };
      }
      Response = await axios.post(url,
        {
          mode: modeValue,
          category: categoryValue,
          seq: seqValue
        }, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Referer': url,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    console.log(`Response.data : ${Response.data}`)
    const $ = cheerio.load(Response.data);
    return { error: error, data: Response.data };
  },



  getTreatiseLinkTotalCount: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    // https://ir.ymlib.yonsei.ac.kr/researcher-profile?ep=791&type=1&page=1&offset=0
    try {
      Response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    let $ = null
    try {
      $ = cheerio.load(Response.data);
      let articlesCount = 0
      const articlesText = $('div.list_tab ul li:first-child span').text();
      articlesCount = parseInt(articlesText.match(/\((\d+)\)/)[1]);
      console.log(`articlesCount: ${articlesCount}`);
      return { error: error, data: articlesCount };
    } catch (error) {
      return { error: error, data: null };
    }
  },


  getTreatiseDetail: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let items = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    // https://ir.ymlib.yonsei.ac.kr/researcher-profile?ep=791&type=1&page=1&offset=0
    try {
      Response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }

    let $ = null

    try {
      $ = cheerio.load(Response.data);
      const arrLinks = []
      $('table.list_tbl tbody tr').each((index, element) => {
        const firstLink = $(element).find('td.alleft_td a').first().attr('href');
        items = {
          url: `https://ir.ymlib.yonsei.ac.kr/${firstLink}`
        }
        // console.log(firstLink);
        arrLinks.push(items)
      });


      return { error: error, data: arrLinks };
    } catch (error) {
      return { error: error, data: null };
    }
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



  setTreatiseDetail: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    // https://ir.ymlib.yonsei.ac.kr/researcher-profile?ep=791&type=1&page=1&offset=0
    try {
      Response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    let $ = null


    try {
      $ = cheerio.load(Response.data);
      const treatise = []
      const PaperName = $('p.view_title').text().trim().replace(/\t/g, '').replace(/\n/g, '');
      let Titem = {
        title: PaperName ? PaperName : null,
        doi: null,
        journalName: null,
        authorRule: null,
        publicationDate: null,
        url: null,
        authorName: null,
        abstract: null,
        keywords: null,
        impactFactor: 0,
        totalCitations: 0,
        referencesThesis: null,
        subjectClassification: null,
        publicationLocation: null
      }


      $('dl.row_dl').each((index, element) => {
        const dtText = $(element).find('dt').text().trim();
        if (dtText === 'Authors') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.authorName = ddText ? ddText : null
        }
        if (dtText === 'Journal Title') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.journalName = ddText ? ddText : null
        }
        if (dtText === 'Keywords') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.keywords = ddText ? ddText : null
        }
        if (dtText === 'Abstract') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.abstract = ddText ? ddText : null
        }
        if (dtText === 'URI') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.url = ddText ? ddText : null
        }
        //
        if (dtText === 'Issue Date') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);

          if (CS.YYYY_MM_DD(ddText)) {
            Titem.publicationDate = CS.YYYY_MM_DD(ddText)
          }
        }
        if (dtText === 'DOI') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.doi = ddText ? ddText : null
        }
      });
      console.log(Titem);


      return { error: error, data: Titem };
    } catch (error) {
      return { error: error, data: null };
    }
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



}



