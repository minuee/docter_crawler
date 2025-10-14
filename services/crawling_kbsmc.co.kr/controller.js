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
    const url01 = `https://main.kbsmc.co.kr/main/part/list.do`;
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
    const dept = [];
    $('div.medipart_list ul li').each((index, element) => {
      //const name = $(element).find('div.deptinfo').text().trim();
      const name = $(element).find('div.deptinfo')
      .contents()               // 모든 자식 노드(텍스트 + 엘리먼트)
      .filter(function() {
        return this.nodeType === 3; // 텍스트 노드만 필터링
      }).text().trim();
      const tempLink = $(element).find('div.deptlink a.doctor').attr('href');
      const link = _.replace(tempLink, '../', 'https://main.kbsmc.co.kr/main/');
      const info = {
        deptName : name,
        link,
      };
      dept.push(info);
    });
    return { error: error, data: dept };
  },

  crwalingProcess02: async (link) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!link) {
      return { error: true, data: null };
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
    // 쓰레기 태그 날림
    // $('span').empty(); // 못날림 (이름과 진료과가 붙어있음)
    const doctors = [];
    $('ul.dr_list li').each((index, element) => {
      const doctorName = $(element).find('div.info div.d_info div.name a').find('span:first-child').text().trim();
      const deptName = $(element).find('div.info div.d_info div.name a span.part').text().trim();
      const tempLink = $(element).find('div.btn_area a.con_sbtn.blue_l').attr('href');
      const link = (CS.isEmpty(tempLink)) ? null : _.replace(tempLink, '/main/', 'https://main.kbsmc.co.kr/main/');
      const profileUrlTmp = $(element).find('div.info div.photo').find("img").attr('src');
      const profileUrl = `https://main.kbsmc.co.kr${profileUrlTmp}`
      // 의료진 정보를 객체로 저장
      const doctor = {
        doctorName: CS.removeMatchingWordFromEnd(doctorName, deptName),
        deptName: deptName,
        url: link,
        profileUrl
      };
      
      doctors.push(doctor);
    });
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
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url01} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const deptName = $('div.wsize p.part').first().text().trim();
    const doctorName = $('div.wsize p.name').first().text().trim();
    const profileImgUrl = $('div.bg_type p img').attr('src');
    const specialty = $('div.clinic p.txtw span').first().text().trim();

    let item = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `https://main.kbsmc.co.kr/${profileImgUrl}`,
      biography: [],
    };

   /*  $('div.section2 div.info_box2 dl.jsInfo').each((index1, element1) => {
      $(element1).find('dt a').html('')
      const type = $(element1).find('dt').text().trim().replace(/\t/g, '').replace(/\n\n/g, '');
      $(element1).find('li').each((index2, liElement) => {
        const liText = $(liElement).text().trim().replace(/\t/g, '').replace(/\n\n/g, '');
        const tempLink = $(liElement).find('a').attr('href');
        const liYear = $(liElement).find('span.year').text();
        const etc = {
          type: type,
          year : liYear,
          text: (liText) ? liText : null,
          url: (tempLink) ? tempLink : null,
        };
        item.biography.push(etc);
      });
    }); */
    // console.log(item);

    $('div.section2 div.info_box2 dl.jsInfo').each((index1, dlElement) => {
      const title = $(dlElement).find('dt').clone().children().remove().end().text().trim();
      
      if (title === '수상경력') {
        $(dlElement).find('dd li').each((_, liElement) => {
          const year = $(liElement).find('.year').text().trim();
          const text = $(liElement).clone().children('.year').remove().end().text().trim();
          console.log(`수상경력 : ${year}, ${text}`)
          item.biography.push({ type: "수상", year, text });
        });
      }else if (title === '학력') {
        $(dlElement).find('dd li').each((_, liElement) => {
          const liText = $(liElement).text().trim().replace(/\t/g, '').replace(/\n\n/g, '');
          console.log(`학력 : ${liText}`)
          item.biography.push({ type: "학력", year : null, text : liText });
        });
      }else if (title === '경력') {
        $(dlElement).find('dd li').each((_, liElement) => {
          const liText = $(liElement).text().trim().replace(/\t/g, '').replace(/\n\n/g, '');
          console.log(`경력 : ${liText}`)
          item.biography.push({ type: "경력", year : null, text : liText });
        });
      }else if (title === '학회') {
        $(dlElement).find('dd li').each((_, liElement) => {
          const liText = $(liElement).text().trim().replace(/\t/g, '').replace(/\n\n/g, '');
          console.log(`학회 : ${liText}`)
          item.biography.push({ type: "학회", year : null, text : liText });
        });
      }else if (title === '언론기사') {
        $(dlElement).find('dd li').each((_, liElement) => {
          const issuer = $(liElement).find('.publisher').text().trim();
          const liText = $(liElement).clone().children('.publisher').remove().end().text().trim();
          console.log(`언론 : ${issuer}, ${liText}`)
          item.biography.push({ type: "언론", issuer, text : liText });
        });
      }
    });
    
    return { error: error, data: item };
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
    const deptName = $('div.wsize p.part').first().text().trim();
    const doctorName = $('div.wsize p.name').first().text().trim();
    console.log(`doctorName ${doctorName} deptName: ${deptName}`);

    let item = {
      doctorName: doctorName,
      deptName: deptName,
      biography: [],
    };


    $('div.section2 div.info_box2 dl.jsInfo').each((index1, dlElement) => {
      const title = $(dlElement).find('dt').clone().children().remove().end().text().trim();
      
      if (title === '논문') {
        $(dlElement).find('dd li').each((_, liElement) => {
          const liText = $(liElement).text().trim().replace(/\t/g, '').replace(/\n\n/g, '');
          
          if ( liText.length > 10 ) {
            console.log(`논문 : ${liText}`)
            item.biography.push({ type: "논문",  title : liText });
          }
        });
      }
    });
    
    return { error: error, data: item };
  },

  crwalingtreatise_old: async (url) => {
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
      console.log(`error on ${url01} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const deptName = $('div.wsize p.part').first().text().trim();
    const doctorName = $('div.wsize p.name').first().text().trim();
    const profileImgUrl = $('div.bg_type p img').attr('src');
    const specialty = $('div.clinic p.txtw span').first().text().trim();

    let item = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `https://main.kbsmc.co.kr/${profileImgUrl}`,
      biography: [],
    };

    $('div.section2 div.wsize div:nth-of-type(3) dl:nth-of-type(1) ul li').each((index1, element1) => {
      const liText = $(element1).text().trim().replace(/\t/g, '').replace(/\n\n/g, '');
      const etc = {
        type: '논문',
        title: (liText) ? liText : null,
        url: null,
      };
      item.biography.push(etc);
    });
    // console.log(item);
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

  getCrawlingDoctorLink_old : async (hid) => {
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



